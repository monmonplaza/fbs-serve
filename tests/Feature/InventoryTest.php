<?php

use App\Models\DiningTable;
use App\Models\Food;
use App\Models\Ingredient;
use App\Models\StockMovement;
use Database\Seeders\RestaurantSeeder;
use Illuminate\Testing\TestResponse;

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

it('lets stock go below zero when a count came in lower after the order was sent', function () {
    $rice = Ingredient::where('name', 'Rice')->firstOrFail();
    $code = sendFor($this, 'Java Rice', 1); // sent while the stock covered it
    $this->postJson("/api/ingredients/{$rice->id}/count", ['counted' => 100])->assertOk(); // the shelf turns out to hold less
    bump($this, $code);
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

// ---------- Phase 2: reserve stock when an order is sent, and block what is sold out ----------
function setRice($test, float $grams): void
{
    $rice = Ingredient::where('name', 'Rice')->firstOrFail();
    $test->postJson("/api/ingredients/{$rice->id}/count", ['counted' => $grams])->assertOk();
}

function foodNamed($test, string $name): array
{
    return collect($test->getJson('/api/foods?per_page=1000')->assertOk()->json('data'))->firstWhere('name', $name);
}

function orderLines($test, array $dishes): TestResponse
{
    $items = collect($dishes)->map(fn ($qty, $name) => ['foodId' => Food::where('name', $name)->value('id'), 'qty' => $qty])->values()->all();

    return $test->postJson("/api/tables/{$test->table->id}/order", ['items' => $items]);
}

it('reserves ingredients the moment an order is sent, and blocks the last portion twice', function () {
    setRice($this, 360); // two portions of Garlic Rice (180 g each)
    expect(foodNamed($this, 'Garlic Rice')['left'])->toBe(2);

    orderLines($this, ['Garlic Rice' => 1])->assertCreated();
    expect((float) Ingredient::where('name', 'Rice')->value('on_hand'))->toBe(360.0) // reserved, not taken yet
        ->and(foodNamed($this, 'Garlic Rice')['left'])->toBe(1)
        ->and(foodNamed($this, 'Java Rice')['left'])->toBe(1); // Java Rice uses the same rice

    orderLines($this, ['Java Rice' => 2])->assertUnprocessable()->assertJsonPath('message', 'Only 1 Java Rice left');
    orderLines($this, ['Java Rice' => 1])->assertCreated();
    expect(foodNamed($this, 'Garlic Rice')['left'])->toBe(0);
    orderLines($this, ['Garlic Rice' => 1])->assertUnprocessable()->assertJsonPath('message', 'Garlic Rice is sold out');
});

it('keeps a dish sold out after the bump, until stock is received', function () {
    setRice($this, 180);
    $code = orderLines($this, ['Garlic Rice' => 1])->assertCreated()->json('data.id');
    bump($this, $code); // the reservation becomes real usage: no double counting
    expect((float) Ingredient::where('name', 'Rice')->value('on_hand'))->toBe(0.0)
        ->and(foodNamed($this, 'Garlic Rice')['left'])->toBe(0);

    $rice = Ingredient::where('name', 'Rice')->firstOrFail();
    $this->postJson("/api/ingredients/{$rice->id}/receive", ['qty' => 540])->assertOk();
    expect(foodNamed($this, 'Garlic Rice')['left'])->toBe(3);
    orderLines($this, ['Garlic Rice' => 3])->assertCreated();
});

it('blocks dishes that together need more of one ingredient than there is', function () {
    setRice($this, 360);
    orderLines($this, ['Garlic Rice' => 1, 'Java Rice' => 2])->assertUnprocessable()
        ->assertJsonPath('message', 'There is not enough Rice for this whole order. Take out a dish and try again.');
    orderLines($this, ['Garlic Rice' => 1, 'Java Rice' => 1])->assertCreated();
});

it('shows the portions left per size, and a dish without a recipe is never limited', function () {
    $dough = Ingredient::where('name', 'Pizza dough')->firstOrFail();
    $this->postJson("/api/ingredients/{$dough->id}/count", ['counted' => 500])->assertOk(); // 160 / 240 / 320 g per size
    $pizza = foodNamed($this, 'Classic Pizza');
    expect(collect($pizza['variants'])->pluck('left', 'name')->all())->toBe(['Small' => 3, 'Medium' => 2, 'Large' => 1])
        ->and($pizza['left'])->toBe(3);

    $large = collect($pizza['variants'])->firstWhere('name', 'Large');
    $this->postJson("/api/tables/{$this->table->id}/order", ['items' => [['foodId' => $pizza['id'], 'variantId' => $large['id'], 'qty' => 2]]])
        ->assertUnprocessable()->assertJsonPath('message', 'Only 1 Classic Pizza (Large) left');

    expect(foodNamed($this, 'Leche Flan'))->not->toHaveKey('left');
    orderLines($this, ['Leche Flan' => 5])->assertCreated();
});

it('stops a guest adding more than is left to the shared plate', function () {
    setRice($this, 180);
    $guestTable = DiningTable::where('name', 'Table 4')->firstOrFail();
    $session = $guestTable->sessions()->where('closed_at', null)->first() ?? throw new RuntimeException('Table 4 should be seeded as seated');
    $url = "/api/public/tables/{$guestTable->id}/plate-lines?k={$session->token}";
    $rice = Food::where('name', 'Garlic Rice')->value('id');

    $this->postJson($url, ['foodId' => $rice, 'by' => 'Guest 1'])->assertOk();
    $this->postJson($url, ['foodId' => $rice, 'by' => 'Guest 2'])->assertUnprocessable()->assertJsonPath('message', 'Only 1 Garlic Rice left');
    setRice($this, 0);
    $this->postJson($url, ['foodId' => $rice, 'by' => 'Guest 3'])->assertUnprocessable()->assertJsonPath('message', 'Garlic Rice is sold out');
});

it('does not block an advance reservation order, which is a plan for another day', function () {
    setRice($this, 0);
    $table = DiningTable::where('name', 'Table 4')->firstOrFail();
    $this->postJson('/api/reservations', [
        'name' => 'Cruz', 'phone' => '0917', 'pax' => 2, 'at' => now()->addDays(3)->setTime(19, 0)->valueOf(), 'tableId' => (string) $table->id, 'note' => '',
        'order' => [['foodId' => Food::where('name', 'Garlic Rice')->value('id'), 'variantId' => null, 'qty' => 2]],
    ])->assertCreated();
});
