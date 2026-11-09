<?php

use App\Models\DiningTable;
use App\Models\Food;
use App\Models\Order;
use Database\Seeders\RestaurantSeeder;

/** Guests without a phone: staff enter the order for the table by hand. */
beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
    $this->table = DiningTable::where('status', 'inactive')->firstOrFail();
});

it('staff send an order for a table and later sends add rounds to the same order', function () {
    $rice = Food::where('name', 'Garlic Rice')->firstOrFail();
    $kk = Food::where('name', 'Kare-Kare')->firstOrFail();

    $this->postJson("/api/tables/{$this->table->id}/order", ['items' => [['foodId' => $rice->id, 'qty' => 1]]])
        ->assertUnprocessable()->assertJsonPath('message', 'Activate the table first.');

    $this->postJson("/api/tables/{$this->table->id}/activate", ['guests' => 2])->assertOk();
    $first = $this->postJson("/api/tables/{$this->table->id}/order", [
        'by' => 'Jun',
        'items' => [
            ['foodId' => $rice->id, 'qty' => 2, 'name' => 'Free rice', 'price' => 0],
            ['foodId' => $kk->id, 'qty' => 1, 'note' => 'No bagoong'],
        ],
    ])->assertCreated()->assertJsonPath('data.round', 1)->assertJsonPath('data.status', 'queued');
    $items = collect($first->json('data.items'));
    expect($items->firstWhere('name', 'Garlic Rice')['price'])->toEqual((float) $rice->unitPrice(null))
        ->and($items->firstWhere('name', 'Garlic Rice')['qty'])->toBe(2);

    $this->postJson("/api/tables/{$this->table->id}/order", ['items' => [['foodId' => $rice->id, 'qty' => 1]]])
        ->assertCreated()->assertJsonPath('data.round', 2)->assertJsonPath('data.code', $first->json('data.code'));
    expect(Order::count())->toBe(1)
        ->and(DiningTable::find($this->table->id)->status)->toBe('ordering');
});

it('rejects an empty order and a table that asked for the bill', function () {
    $rice = Food::where('name', 'Garlic Rice')->firstOrFail();
    $this->postJson("/api/tables/{$this->table->id}/activate", ['guests' => 1])->assertOk();
    $this->postJson("/api/tables/{$this->table->id}/order", ['items' => []])->assertUnprocessable();

    $this->table->refresh()->update(['status' => 'billout']);
    $this->postJson("/api/tables/{$this->table->id}/order", ['items' => [['foodId' => $rice->id, 'qty' => 1]]])
        ->assertUnprocessable()->assertJsonPath('message', 'The bill was already requested for this table.');
});
