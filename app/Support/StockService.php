<?php

namespace App\Support;

use App\Exceptions\ApiException;
use App\Models\FoodVariant;
use App\Models\Ingredient;
use App\Models\OrderRound;
use App\Models\RecipeLine;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

/** Stock rules. Every change goes through here so the movement log always explains the balance. */
final class StockService
{
    /**
     * Subtracts the ingredients of a round once the kitchen bumps it out (completed). Runs once per round. Dishes without a
     * recipe are not tracked. Stock may go below zero: the food is already cooked, and the count then corrects it.
     */
    public static function useForRound(OrderRound $round): void
    {
        DB::transaction(function () use ($round) {
            $round = OrderRound::query()->lockForUpdate()->findOrFail($round->id);
            if ($round->stock_used_at) {
                return;
            }
            $round->loadMissing('items');
            $lines = RecipeLine::query()->whereIn('food_id', $round->items->pluck('food_id')->filter()->unique())->get()->groupBy('food_id');
            $need = []; // ingredient id => total quantity
            foreach ($round->items as $item) {
                foreach ($lines->get($item->food_id, collect()) as $l) {
                    if ($l->variant_id === null || (int) $l->variant_id === (int) $item->variant_id) {
                        $need[$l->ingredient_id] = ($need[$l->ingredient_id] ?? 0) + (float) $l->qty * $item->qty;
                    }
                }
            }
            ksort($need); // a fixed lock order, so two rounds bumped together cannot deadlock
            foreach ($need as $ingredientId => $qty) {
                self::move(Ingredient::query()->lockForUpdate()->findOrFail($ingredientId), 'used', -$qty, null, $round->code, 'Kitchen');
            }
            $round->update(['stock_used_at' => now()]);
        });
    }

    /** Stock arrives (positive qty) or leaves as waste (negative). */
    public static function change(Ingredient $ingredient, string $type, float $qty, ?string $note, string $by): StockMovement
    {
        return DB::transaction(fn () => self::move(Ingredient::query()->lockForUpdate()->findOrFail($ingredient->id), $type, $qty, $note, null, $by));
    }

    /** A physical count: the stock becomes what was counted, and the difference is logged. */
    public static function count(Ingredient $ingredient, float $counted, ?string $note, string $by): StockMovement
    {
        return DB::transaction(function () use ($ingredient, $counted, $note, $by) {
            $locked = Ingredient::query()->lockForUpdate()->findOrFail($ingredient->id);

            return self::move($locked, 'count', $counted - (float) $locked->on_hand, $note, null, $by);
        });
    }

    private static function move(Ingredient $ingredient, string $type, float $qty, ?string $note, ?string $ref, string $by): StockMovement
    {
        $balance = round((float) $ingredient->on_hand + $qty, 3);
        $ingredient->update(['on_hand' => $balance]);

        return StockMovement::query()->create([
            'ingredient_id' => $ingredient->id, 'type' => $type, 'qty' => round($qty, 3), 'balance' => $balance,
            'note' => $note !== null && trim($note) !== '' ? mb_substr(trim($note), 0, 255) : null, 'ref' => $ref, 'by' => mb_substr($by, 0, 60),
        ]);
    }

    /**
     * Ingredients that are promised but not yet taken from the shelf: the recipes of every round that was sent to the kitchen
     * and not bumped yet. Counting them keeps two tables from both ordering the last portion.
     *
     * @return array<int, float> ingredient id => amount
     */
    public static function reserved(): array
    {
        return DB::table('app_order_items as oi')
            ->join('app_order_rounds as r', 'r.id', '=', 'oi.round_id')
            ->join('app_recipe_lines as rl', function ($j) {
                $j->on('rl.food_id', '=', 'oi.food_id')->where(fn ($w) => $w->whereNull('rl.variant_id')->orWhereColumn('rl.variant_id', 'oi.variant_id'));
            })
            ->whereNull('r.stock_used_at')->whereIn('r.status', ['queued', 'cooking', 'plating'])
            ->groupBy('rl.ingredient_id')->selectRaw('rl.ingredient_id as id, SUM(rl.qty * oi.qty) as need')->pluck('need', 'id')
            ->map(fn ($n) => (float) $n)->all();
    }

    /** The same as reserved(), worked out once per request (the stock list asks for every ingredient). */
    public static function reservedForRequest(): array
    {
        $attributes = request()->attributes;
        if (! $attributes->has('stock.reserved')) {
            $attributes->set('stock.reserved', self::reserved());
        }

        return $attributes->get('stock.reserved');
    }

    /**
     * What can still be sold: on hand minus reserved.
     *
     * @return array<int, float> ingredient id => amount (can be below zero)
     */
    public static function available(): array
    {
        $reserved = self::reserved();

        return Ingredient::query()->pluck('on_hand', 'id')->map(fn ($on, $id) => round((float) $on - ($reserved[$id] ?? 0), 3))->all();
    }

    /**
     * Portions that can still be made of each dish with a recipe, from its scarcest ingredient. A dish without a recipe is not
     * tracked and is absent. A dish with sizes has a count per size; `all` is the most of any size (null when a size is untracked).
     *
     * @return array<int, array{all: ?int, variants: array<int, ?int>}> food id => counts
     */
    public static function portionsLeft(): array
    {
        $lines = RecipeLine::query()->get(['food_id', 'variant_id', 'ingredient_id', 'qty'])->groupBy('food_id');
        if ($lines->isEmpty()) {
            return [];
        }
        $available = self::available();
        $sizes = FoodVariant::query()->whereIn('food_id', $lines->keys())->get(['id', 'food_id'])->groupBy('food_id');
        $count = function ($applicable) use ($available): ?int {
            $left = null;
            foreach ($applicable as $l) {
                if ((float) $l->qty > 0) {
                    $n = max(0, (int) floor(round(($available[$l->ingredient_id] ?? 0) / (float) $l->qty, 6)));
                    $left = $left === null ? $n : min($left, $n);
                }
            }

            return $left;
        };
        $out = [];
        foreach ($lines as $foodId => $recipe) {
            $variants = $sizes->get($foodId, collect());
            if ($variants->isEmpty()) {
                $out[$foodId] = ['all' => $count($recipe->whereNull('variant_id')), 'variants' => []];

                continue;
            }
            $per = [];
            foreach ($variants as $v) {
                $per[$v->id] = $count($recipe->filter(fn ($l) => $l->variant_id === null || (int) $l->variant_id === (int) $v->id));
            }
            $out[$foodId] = ['all' => in_array(null, $per, true) ? null : max($per), 'variants' => $per];
        }

        return $out;
    }

    /** The same as portionsLeft, worked out once per request (menus ask for every dish). */
    public static function portionsLeftForRequest(): array
    {
        $attributes = request()->attributes;
        if (! $attributes->has('stock.portions')) {
            $attributes->set('stock.portions', self::portionsLeft());
        }

        return $attributes->get('stock.portions');
    }

    /** Portions left of one dish (and size), or null when it is not tracked. */
    public static function leftFor(int $foodId, ?int $variantId, ?array $map = null): ?int
    {
        $row = ($map ?? self::portionsLeft())[$foodId] ?? null;

        return $row === null ? null : ($variantId !== null && array_key_exists($variantId, $row['variants']) ? $row['variants'][$variantId] : $row['all']);
    }

    /**
     * Refuses an order the stock cannot cover: a sold-out dish, more portions than are left, or dishes that together need more of
     * one ingredient than there is. Call it inside the transaction that creates the order, so the numbers cannot change under it.
     *
     * @param  array<int, array{food_id: int, variant_id: ?int, name: string, qty: int}>  $items
     *
     * @throws ApiException
     */
    public static function assertAvailable(array $items): void
    {
        $map = self::portionsLeft();
        if ($map === []) {
            return;
        }
        $wanted = [];
        foreach ($items as $i) {
            $key = $i['food_id'].'|'.($i['variant_id'] ?? '');
            $wanted[$key] = ['item' => $i, 'qty' => ($wanted[$key]['qty'] ?? 0) + (int) $i['qty']];
        }
        foreach ($wanted as ['item' => $i, 'qty' => $qty]) {
            $left = self::leftFor((int) $i['food_id'], $i['variant_id'] === null ? null : (int) $i['variant_id'], $map);
            if ($left !== null && $qty > $left) {
                throw new ApiException($left <= 0 ? "{$i['name']} is sold out" : "Only {$left} {$i['name']} left");
            }
        }
        // Dishes can pass one by one and still fight over a shared ingredient.
        $lines = RecipeLine::query()->whereIn('food_id', collect($items)->pluck('food_id')->unique())->get()->groupBy('food_id');
        $available = self::available();
        $need = [];
        foreach ($wanted as ['item' => $i, 'qty' => $qty]) {
            foreach ($lines->get($i['food_id'], collect()) as $l) {
                if ($l->variant_id === null || (int) $l->variant_id === (int) $i['variant_id']) {
                    $need[$l->ingredient_id] = ($need[$l->ingredient_id] ?? 0) + (float) $l->qty * $qty;
                }
            }
        }
        foreach ($need as $ingredientId => $amount) {
            if ($amount > ($available[$ingredientId] ?? 0) + 0.0005) {
                $name = Ingredient::query()->whereKey($ingredientId)->value('name');
                throw new ApiException("There is not enough {$name} for this whole order. Take out a dish and try again.");
            }
        }
    }

    /** Replaces a dish's recipe. Lines for the same ingredient and size are merged. */
    public static function saveRecipe(int $foodId, array $lines): void
    {
        DB::transaction(function () use ($foodId, $lines) {
            $merged = [];
            foreach ($lines as $l) {
                $key = $l['ingredientId'].'|'.($l['variantId'] ?? '');
                $merged[$key] = ['ingredient_id' => (int) $l['ingredientId'], 'variant_id' => $l['variantId'] ?? null, 'qty' => ($merged[$key]['qty'] ?? 0) + (float) $l['qty']];
            }
            RecipeLine::query()->where('food_id', $foodId)->delete();
            foreach ($merged as $m) {
                RecipeLine::query()->create($m + ['food_id' => $foodId]);
            }
        });
    }

    /** @throws ApiException */
    public static function positive(float $qty): float
    {
        if ($qty <= 0) {
            throw new ApiException('Enter an amount above zero.');
        }

        return $qty;
    }
}
