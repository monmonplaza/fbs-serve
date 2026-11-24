<?php

use App\Models\DiningTable;
use App\Models\Discount;
use App\Models\Food;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderRound;
use App\Models\PaymentMethod;
use App\Support\Money;
use Database\Seeders\RestaurantSeeder;

/** Each guest pays for the dishes they added; the order closes when the last guest has paid. */
beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
    $this->table = DiningTable::where('status', 'inactive')->firstOrFail();
    $this->postJson("/api/tables/{$this->table->id}/activate", ['guests' => 3])->assertOk();
    $rice = Food::where('name', 'Garlic Rice')->firstOrFail();
    $kk = Food::where('name', 'Kare-Kare')->firstOrFail();
    $r = $this->postJson("/api/tables/{$this->table->id}/order", ['items' => [['foodId' => $rice->id, 'qty' => 2], ['foodId' => $kk->id, 'qty' => 1]]])->assertCreated();
    $this->code = $r->json('data.code');
    // Garlic Rice: one each for Guest 311 and Guest 482; Kare-Kare: Guest 482.
    OrderItem::where('name', 'Garlic Rice')->update(['added_by' => ['Guest 311' => 1, 'Guest 482' => 1]]);
    OrderItem::where('name', 'Kare-Kare')->update(['added_by' => ['Guest 482' => 1]]);
    OrderRound::query()->update(['status' => 'served']);
    $this->rice = (float) OrderItem::where('name', 'Garlic Rice')->value('price');
    $this->kk = (float) OrderItem::where('name', 'Kare-Kare')->value('price');
    $this->cash = (string) PaymentMethod::where('active', true)->firstOrFail()->id;
});

it('closes the order after the last guest pays, with each guest paying only their own dishes', function () {
    $a = $this->postJson("/api/orders/{$this->code}/pay-guest", ['guest' => 'Guest 311', 'pay' => ['method' => $this->cash, 'amount' => $this->rice]])
        ->assertOk()->assertJsonPath('data.closed', false);
    expect(Order::first()->isPaid())->toBeFalse()
        ->and(DiningTable::find($this->table->id)->status)->not->toBe('cleaning');

    $pwd = Discount::where('pct', 20)->firstOrFail();
    $b = $this->rice + $this->kk;
    $this->postJson("/api/orders/{$this->code}/pay-guest", ['guest' => 'Guest 482', 'discountId' => $pwd->id, 'pay' => ['method' => $this->cash, 'amount' => round($b * 0.8, 2), 'received' => 1000]])
        ->assertOk()->assertJsonPath('data.closed', true);

    $o = Order::first();
    expect($o->isPaid())->toBeTrue()
        ->and((float) $o->discount_total)->toBe(round($b * 0.2, 2))
        ->and($o->discount_name)->toBe($pwd->name)
        ->and((float) $o->payments->sum('amount'))->toBe(round($this->rice + $b * 0.8, 2))
        ->and(DiningTable::find($this->table->id)->status)->toBe('cleaning');

    $row = collect($this->getJson('/api/orders')->json('data'))->first();
    expect($row['status'])->toBe('paid')->and($row['discount']['amount'])->toEqual(round($b * 0.2, 2))
        ->and($row['guestPaid'])->toHaveCount(2);
});

it('refuses a wrong amount, a second payment for a paid guest, an unknown guest and a whole-bill payment after a guest paid', function () {
    $this->postJson("/api/orders/{$this->code}/pay-guest", ['guest' => 'Guest 311', 'pay' => ['method' => $this->cash, 'amount' => 1]])
        ->assertUnprocessable()->assertJsonPath('message', 'The payment must be '.Money::peso($this->rice));
    $this->postJson("/api/orders/{$this->code}/pay-guest", ['guest' => 'Guest 999', 'pay' => ['method' => $this->cash, 'amount' => 10]])
        ->assertUnprocessable();
    $this->postJson("/api/orders/{$this->code}/pay-guest", ['guest' => 'Guest 311', 'pay' => ['method' => $this->cash, 'amount' => $this->rice]])->assertOk();
    $this->postJson("/api/orders/{$this->code}/pay-guest", ['guest' => 'Guest 311', 'pay' => ['method' => $this->cash, 'amount' => $this->rice]])
        ->assertUnprocessable()->assertJsonPath('message', 'This guest has nothing left to pay.');
    $this->postJson("/api/orders/{$this->code}/pay", ['pays' => [['method' => $this->cash, 'amount' => 100]]])
        ->assertUnprocessable();
});

it('waits until every order is served', function () {
    OrderRound::query()->update(['status' => 'cooking']);
    $this->postJson("/api/orders/{$this->code}/pay-guest", ['guest' => 'Guest 311', 'pay' => ['method' => $this->cash, 'amount' => $this->rice]])
        ->assertUnprocessable();
});

it('counts a guest-paid order in the sales report with the right net', function () {
    $pwd = Discount::where('pct', 20)->firstOrFail();
    $b = $this->rice + $this->kk;
    $this->postJson("/api/orders/{$this->code}/pay-guest", ['guest' => 'Guest 311', 'pay' => ['method' => $this->cash, 'amount' => $this->rice]])->assertOk();
    $this->postJson("/api/orders/{$this->code}/pay-guest", ['guest' => 'Guest 482', 'discountId' => $pwd->id, 'pay' => ['method' => $this->cash, 'amount' => round($b * 0.8, 2)]])->assertOk();
    $r = $this->getJson('/api/reports/sales?from='.now()->toDateString().'&to='.now()->toDateString().'&group=day')->assertOk()->json('data.totals');
    expect($r['net'])->toEqual(round($this->rice + $b * 0.8, 2))->and($r['discounts'])->toEqual(round($b * 0.2, 2));
});
