<?php

namespace App\Support;

use App\Exceptions\ApiException;
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
