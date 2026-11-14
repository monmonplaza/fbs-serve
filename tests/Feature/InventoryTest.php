<?php

use App\Models\DiningTable;
use App\Models\Food;
use App\Models\Ingredient;
use App\Models\StockMovement;
use Database\Seeders\RestaurantSeeder;

/** Phase 1 of inventory: ingredients, recipes, and stock that leaves when the kitchen bumps an order. */
beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
    $this->table = DiningTable::where('status', 'inactive')->firstOrFail();
    $this->postJson("/api/tables/{$this->table->id}/activate", ['guests' => 2])->assertOk();
});

function sendFor($test, string $dish, int $qty = 1, ?string $size = null): string
{
    $food = Food::with('variants')->where('name', $dish)->firstOrFail();
    $vid = $size ? $food->variants->firstWhere('name', $size)->id : null;

    return $test->postJson("/api/tables/{$test->table->id}/order", ['items' => [['foodId' => $food->id, 'variantId' => $vid, 'qty' => $qty]]])->assertCreated()->json('data.id');
}

function bump($test, string $code): void
{
    foreach (['cooking', 'plating', 'completed'] as $_) {
        $test->patchJson("/api/orders/{$code}/advance")->assertOk();
    }
}

it('manages ingredients and logs every stock change', function () {
    $id = $this->postJson('/api/ingredients', ['name' => 'Soy sauce', 'unit' => 'ml', 'onHand' => 2000, 'reorderLevel' => 500, 'cost' => 0.05])
        ->assertCreated()->assertJsonPath('data.onHand', 2000)->assertJsonPath('data.low', false)->json('data.id');
    $this->postJson('/api/ingredients', ['name' => 'Soy sauce', 'unit' => 'ml'])->assertUnprocessable();

    $this->postJson("/api/ingredients/{$id}/receive", ['qty' => 1000, 'note' => 'Delivery'])->assertOk()->assertJsonPath('data.onHand', 3000);
    $this->postJson("/api/ingredients/{$id}/waste", ['qty' => 2600, 'note' => 'Spilled'])->assertOk()->assertJsonPath('data.onHand', 400)->assertJsonPath('data.low', true);
    $this->postJson("/api/ingredients/{$id}/count", ['counted' => 450])->assertOk()->assertJsonPath('data.onHand', 450);
    $this->postJson("/api/ingredients/{$id}/receive", ['qty' => 0])->assertUnprocessable();
    $this->postJson("/api/ingredients/{$id}", ['name' => 'Soy sauce', 'unit' => 'ml', 'reorderLevel' => 100, 'onHand' => 99999])->assertOk()->assertJsonPath('data.onHand', 450);

    $log = $this->getJson("/api/stock-movements?ingredient={$id}")->assertOk()->json('data');
    expect(collect($log)->pluck('type')->all())->toBe(['count', 'waste', 'received', 'received'])
        ->and(collect($log)->pluck('qty')->all())->toEqual([50, -2600, 1000, 2000])
        ->and(collect($log)->pluck('balance')->all())->toEqual([450, 400, 3000, 2000]);
});

it('subtracts the ingredients when the kitchen bumps the order, once', function () {
    $rice = Ingredient::where('name', 'Rice')->firstOrFail();
    $garlic = Ingredient::where('name', 'Garlic')->firstOrFail();
    $before = ['rice' => (float) $rice->on_hand, 'garlic' => (float) $garlic->on_hand];

    $code = sendFor($this, 'Garlic Rice', 3);
    expect((float) $rice->refresh()->on_hand)->toBe($before['rice']); // sending alone takes nothing
    foreach (['cooking', 'plating'] as $_) {
        $this->patchJson("/api/orders/{$code}/advance")->assertOk();
    }
    expect((float) $rice->refresh()->on_hand)->toBe($before['rice']); // not yet bumped
    $this->patchJson("/api/orders/{$code}/advance")->assertOk();

    expect((float) $rice->refresh()->on_hand)->toBe($before['rice'] - 540.0)
        ->and((float) $garlic->refresh()->on_hand)->toBe($before['garlic'] - 24.0);
    $used = StockMovement::where('type', 'used')->where('ref', $code)->get();
    expect($used)->toHaveCount(3)->and($used->first()->by)->toBe('Kitchen');

    // Serving it later, or bumping the same round again, takes nothing more.
    $this->patchJson("/api/orders/{$code}/serve")->assertOk();
    expect((float) $rice->refresh()->on_hand)->toBe($before['rice'] - 540.0);
});

it('uses the recipe of the size that was ordered, and ignores dishes without a recipe', function () {
    $dough = Ingredient::where('name', 'Pizza dough')->firstOrFail();
    $cheese = Ingredient::where('name', 'Cheese')->firstOrFail();
    [$d, $c] = [(float) $dough->on_hand, (float) $cheese->on_hand];

    bump($this, sendFor($this, 'Classic Pizza', 2, 'Large'));
    expect((float) $dough->refresh()->on_hand)->toBe($d - 640.0)->and((float) $cheese->refresh()->on_hand)->toBe($c - 320.0);

    $count = StockMovement::count();
    bump($this, sendFor($this, 'Leche Flan'));
    expect(StockMovement::count())->toBe($count);
});

it('lets stock go below zero when the food was already cooked', function () {
    $rice = Ingredient::where('name', 'Rice')->firstOrFail();
    $this->postJson("/api/ingredients/{$rice->id}/count", ['counted' => 100])->assertOk();
    bump($this, sendFor($this, 'Java Rice', 1));
    expect((float) $rice->refresh()->on_hand)->toBe(-80.0);
    $this->getJson('/api/ingredients')->assertOk();
});

it('saves a recipe, merges repeated lines and rejects a size from another dish', function () {
    $food = Food::with('variants')->where('name', 'Sizzling Sisig')->firstOrFail();
    $pork = Ingredient::where('name', 'Pork')->value('id');
    $garlic = Ingredient::where('name', 'Garlic')->value('id');
    $solo = $food->variants->firstWhere('name', 'Solo')->id;

    $this->postJson("/api/foods/{$food->id}/recipe", ['lines' => [
        ['ingredientId' => $pork, 'variantId' => null, 'qty' => 100], ['ingredientId' => $pork, 'variantId' => null, 'qty' => 50],
        ['ingredientId' => $garlic, 'variantId' => $solo, 'qty' => 5],
    ]])->assertOk()->assertJsonCount(2, 'data');
    expect(collect($this->getJson("/api/foods/{$food->id}/recipe")->json('data'))->firstWhere('ingredientId', (string) $pork)['qty'])->toEqual(150);

    $other = Food::with('variants')->where('name', 'Classic Pizza')->firstOrFail()->variants->first()->id;
    $this->postJson("/api/foods/{$food->id}/recipe", ['lines' => [['ingredientId' => $pork, 'variantId' => $other, 'qty' => 1]]])->assertUnprocessable();
    $this->postJson("/api/foods/{$food->id}/recipe", ['lines' => [['ingredientId' => $pork, 'qty' => 0]]])->assertUnprocessable();
    $this->postJson("/api/foods/{$food->id}/recipe", ['lines' => []])->assertOk()->assertJsonCount(0, 'data');
});

it('does not delete an ingredient that is in a recipe', function () {
    $rice = Ingredient::where('name', 'Rice')->firstOrFail();
    $this->deleteJson("/api/ingredients/{$rice->id}")->assertUnprocessable()
        ->assertJsonPath('message', 'This ingredient is used in recipes. Take it out of the recipes first, or turn it off instead.');
    $free = Ingredient::create(['name' => 'Salt', 'unit' => 'g']);
    $this->deleteJson("/api/ingredients/{$free->id}")->assertNoContent();
});
