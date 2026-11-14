<?php

use App\Models\DiningTable;
use App\Models\Food;
use App\Models\Order;
use Database\Seeders\RestaurantSeeder;

/** Guests who leave before ordering (deactivate) or change tables (move) without losing their orders. */
beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
    [$this->a, $this->b] = DiningTable::where('status', 'inactive')->orderBy('id')->take(2)->get()->all();
    $this->rice = Food::where('name', 'Garlic Rice')->firstOrFail();
});

it('deactivates a table with no orders and closes its session', function () {
    $t = $this->postJson("/api/tables/{$this->a->id}/activate", ['guests' => 2])->json('data');
    $this->postJson("/api/tables/{$this->a->id}/deactivate")->assertOk()->assertJsonPath('data.status', 'inactive')->assertJsonPath('data.token', null);
    $this->postJson("/api/public/tables/{$this->a->id}/join", ['code' => $t['code']])->assertStatus(409);
    $this->getJson("/api/public/tables/{$this->a->id}/plate?k={$t['token']}")->assertForbidden();
    $this->postJson("/api/tables/{$this->a->id}/deactivate")->assertUnprocessable();
});

it('will not deactivate a table that already has orders', function () {
    $this->postJson("/api/tables/{$this->a->id}/activate", ['guests' => 2])->assertOk();
    $this->postJson("/api/tables/{$this->a->id}/order", ['items' => [['foodId' => $this->rice->id, 'qty' => 1]]])->assertCreated();
    $this->postJson("/api/tables/{$this->a->id}/deactivate")->assertUnprocessable()
        ->assertJsonPath('message', "{$this->a->name} already has orders. Use Move guests to take them to another table.");
    expect(DiningTable::find($this->a->id)->status)->toBe('ordering');
});

it('moves the guests with their orders, plate and table code to a free table', function () {
    $t = $this->postJson("/api/tables/{$this->a->id}/activate", ['guests' => 3])->json('data');
    $this->postJson("/api/tables/{$this->a->id}/order", ['items' => [['foodId' => $this->rice->id, 'qty' => 2]]])->assertCreated();
    $this->postJson("/api/public/tables/{$this->a->id}/plate-lines?k={$t['token']}", ['foodId' => $this->rice->id, 'by' => 'Guest 1'])->assertOk();

    $moved = $this->postJson("/api/tables/{$this->a->id}/move-guests", ['to' => $this->b->id])->assertOk()->json('data');
    expect($moved['id'])->toBe((string) $this->b->id)->and($moved['token'])->toBe($t['token'])->and($moved['code'])->toBe($t['code'])
        ->and($moved['guests'])->toBe(3)->and($moved['status'])->toBe('ordering');
    expect(DiningTable::find($this->a->id)->status)->toBe('inactive')
        ->and(Order::first()->table_id)->toBe($this->b->id);

    // The same phone token and table code now work on the new table, and not on the old one.
    $this->getJson("/api/public/tables/{$this->b->id}/plate?k={$t['token']}")->assertOk()->assertJsonCount(1, 'data');
    $this->getJson("/api/public/tables/{$this->a->id}/plate?k={$t['token']}")->assertForbidden();
    $this->postJson("/api/public/tables/{$this->b->id}/join", ['code' => $t['code']])->assertOk()->assertJsonPath('data.token', $t['token']);

    // The old table is free for new guests, and the moved guests can still pay on the new one.
    $this->postJson("/api/tables/{$this->a->id}/activate", ['guests' => 1])->assertOk();
});

it('refuses to move to a busy table, the same table, or from an empty table', function () {
    $this->postJson("/api/tables/{$this->a->id}/activate", ['guests' => 2])->assertOk();
    $this->postJson("/api/tables/{$this->b->id}/activate", ['guests' => 2])->assertOk();
    $this->postJson("/api/tables/{$this->a->id}/move-guests", ['to' => $this->b->id])->assertUnprocessable()->assertJsonPath('message', "{$this->b->name} is not free.");
    $this->postJson("/api/tables/{$this->a->id}/move-guests", ['to' => $this->a->id])->assertUnprocessable();

    $free = DiningTable::where('status', 'inactive')->firstOrFail();
    $this->postJson("/api/tables/{$free->id}/move-guests", ['to' => $this->a->id])->assertUnprocessable();
});
