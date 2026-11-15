<?php

use App\Models\DiningTable;
use App\Models\Discount;
use App\Models\Food;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Role;
use Database\Seeders\RestaurantSeeder;

/** Sales reports count a sale on the day it was PAID, in the restaurant's time zone (Asia/Manila; the database keeps UTC). */
beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
    config(['app.restaurant_timezone' => 'Asia/Manila']);
});

function money(string $name): string
{
    return (string) PaymentMethod::where('name', $name)->value('id');
}

/** Sells dishes at a free table, pays the bill, and sets the moment it was paid (UTC). Returns the order. */
function paidSale($test, array $dishes, string $paidAtUtc, string $method = 'Cash', ?string $discount = null): Order
{
    $table = DiningTable::where('status', 'inactive')->firstOrFail();
    $test->postJson("/api/tables/{$table->id}/activate", ['guests' => 2])->assertOk();
    $items = collect($dishes)->map(fn ($qty, $name) => ['foodId' => Food::where('name', $name)->value('id'), 'qty' => $qty])->values()->all();
    $code = $test->postJson("/api/tables/{$table->id}/order", ['items' => $items])->assertCreated()->json('data.id');
    foreach (range(1, 3) as $_) {
        $test->patchJson("/api/orders/{$code}/advance")->assertOk();
    }
    $test->patchJson("/api/orders/{$code}/serve")->assertOk();
    $total = collect($dishes)->sum(fn ($qty, $name) => $qty * (float) Food::where('name', $name)->value('price'));
    $pct = $discount ? (float) Discount::where('name', $discount)->value('pct') : 0;
    $test->postJson("/api/tables/{$table->id}/pay", [
        'discountId' => $discount ? Discount::where('name', $discount)->value('id') : null,
        'pays' => [['method' => money($method), 'amount' => round($total * (1 - $pct / 100), 2)]],
    ])->assertOk();
    $order = Order::where('table_id', $table->id)->latest('id')->firstOrFail();
    $order->update(['paid_at' => $paidAtUtc]);
    $test->postJson("/api/tables/{$table->id}/clean")->assertOk();

    return $order;
}

function salesReport($test, string $from, string $to, string $group = 'auto'): array
{
    return $test->getJson("/api/reports/sales?from={$from}&to={$to}&group={$group}")->assertOk()->json('data');
}

it('counts a sale on the day it was paid in Manila time, not UTC', function () {
    paidSale($this, ['Garlic Rice' => 2], '2026-11-10 15:30:00');                  // Nov 10, 11:30 PM in Manila
    paidSale($this, ['Kare-Kare' => 1, 'Calamares' => 1], '2026-11-10 16:30:00');   // Nov 11, 12:30 AM in Manila

    $nov10 = salesReport($this, '2026-11-10', '2026-11-10');
    $nov11 = salesReport($this, '2026-11-11', '2026-11-11');
    expect($nov10['totals']['orders'])->toBe(1)->and($nov10['totals']['net'])->toEqual(130)
        ->and($nov11['totals']['orders'])->toBe(1)->and($nov11['totals']['net'])->toEqual(780)
        ->and(salesReport($this, '2026-11-10', '2026-11-11')['totals']['net'])->toEqual(910);
    // Hours are Manila hours too.
    expect(collect($nov10['byHour'])->firstWhere('hour', 23)['orders'])->toBe(1)
        ->and(collect($nov11['byHour'])->firstWhere('hour', 0)['orders'])->toBe(1);
});

it('works out gross, discount, net and the VAT inside the net', function () {
    paidSale($this, ['Kare-Kare' => 1, 'Calamares' => 1], '2026-11-10 04:00:00', 'GCash', 'Senior citizen'); // 780, 20% off = 624
    paidSale($this, ['Garlic Rice' => 2], '2026-11-10 05:00:00');                                          // 130

    $t = salesReport($this, '2026-11-10', '2026-11-10')['totals'];
    expect($t['orders'])->toBe(2)->and($t['gross'])->toEqual(910)->and($t['discounts'])->toEqual(156)->and($t['net'])->toEqual(754)
        ->and($t['vatable'])->toEqual(673.21)->and($t['vat'])->toEqual(80.79)
        ->and($t['avgOrder'])->toEqual(377)->and($t['guests'])->toBe(4)->and($t['itemsSold'])->toBe(4);
});

it('splits sales by payment method, channel, dish and discount, and the payments add up to the net', function () {
    paidSale($this, ['Kare-Kare' => 1, 'Calamares' => 1], '2026-11-10 04:00:00', 'GCash', 'Senior citizen');
    paidSale($this, ['Garlic Rice' => 2], '2026-11-10 05:00:00');
    $takeout = $this->postJson('/api/takeout', ['items' => [['foodId' => Food::where('name', 'Garlic Rice')->value('id'), 'qty' => 1]], 'customer' => 'Ana', 'phone' => '', 'channel' => 'grab', 'ref' => ''])->assertCreated()->json('data');
    foreach (range(1, 3) as $_) {
        $this->patchJson("/api/orders/{$takeout['id']}/advance")->assertOk();
    }
    $this->patchJson("/api/orders/{$takeout['id']}/ready")->assertOk();
    $this->postJson("/api/orders/{$takeout['id']}/pickup", ['pays' => [['method' => money('GCash'), 'amount' => 65]]])->assertOk();
    Order::where('code', $takeout['code'])->update(['paid_at' => '2026-11-10 06:00:00']);

    $r = salesReport($this, '2026-11-10', '2026-11-10');
    $payments = collect($r['byPayment'])->pluck('amount', 'name');
    expect($payments['GCash'])->toEqual(689)->and($payments['Cash'])->toEqual(130)
        ->and(array_sum($payments->all()))->toEqual($r['totals']['net']);
    $channels = collect($r['byChannel'])->pluck('net', 'name');
    expect($channels['Dine-in'])->toEqual(754)->and($channels['GrabFood'])->toEqual(65);
    $rice = collect($r['items'])->firstWhere('name', 'Garlic Rice');
    expect($rice['qty'])->toBe(3)->and($rice['sales'])->toEqual(195)
        ->and($r['items'][0]['name'])->toBe('Garlic Rice') // most sold first
        ->and($r['discounts'])->toHaveCount(1)->and($r['discounts'][0])->toMatchArray(['name' => 'Senior citizen', 'orders' => 1, 'amount' => 156.0])
        ->and(collect($r['byCategory'])->sum('sales'))->toEqual($r['totals']['gross'])
        ->and($r['byTable'])->toHaveCount(1) // both dine-in sales used the same free table
        ->and($r['byTable'][0])->toMatchArray(['orders' => 2, 'net' => 754.0, 'guests' => 4]);
});

it('compares with the previous period of the same length', function () {
    paidSale($this, ['Garlic Rice' => 2], '2026-11-09 04:00:00');                   // Nov 9: 130
    paidSale($this, ['Kare-Kare' => 1], '2026-11-10 04:00:00');                     // Nov 10: 560

    $r = salesReport($this, '2026-11-10', '2026-11-10');
    expect($r['previous'])->toMatchArray(['from' => '2026-11-09', 'to' => '2026-11-09', 'orders' => 1, 'net' => 130.0]);
    $week = salesReport($this, '2026-11-09', '2026-11-15');
    expect($week['previous'])->toMatchArray(['from' => '2026-11-02', 'to' => '2026-11-08', 'orders' => 0]);
});

it('groups by day, week or month with no gaps, and picks a sensible grouping by itself', function () {
    paidSale($this, ['Garlic Rice' => 1], '2026-11-03 04:00:00');   // Tuesday
    paidSale($this, ['Garlic Rice' => 1], '2026-11-12 04:00:00');   // Thursday of the next week

    $days = salesReport($this, '2026-11-01', '2026-11-14');
    expect($days['range']['group'])->toBe('day')->and($days['series'])->toHaveCount(14)
        ->and(collect($days['series'])->firstWhere('key', '2026-11-03')['net'])->toEqual(65)
        ->and(collect($days['series'])->firstWhere('key', '2026-11-04')['orders'])->toBe(0);

    $weeks = salesReport($this, '2026-11-01', '2026-11-30', 'week');
    // Weeks start on Monday, so November 2026 touches six of them (Nov 30 is a Monday).
    expect(collect($weeks['series'])->pluck('key')->all())->toBe(['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'])
        ->and(collect($weeks['series'])->pluck('net')->all())->toEqual([0, 65, 65, 0, 0, 0])
        ->and($weeks['series'][5])->toMatchArray(['from' => '2026-11-30', 'to' => '2026-11-30'])
        ->and($weeks['series'][0])->toMatchArray(['from' => '2026-11-01', 'to' => '2026-11-01']); // clipped to the range

    $months = salesReport($this, '2026-10-01', '2026-12-31', 'month');
    expect(collect($months['series'])->pluck('key')->all())->toBe(['2026-10', '2026-11', '2026-12'])
        ->and(collect($months['series'])->pluck('net')->all())->toEqual([0, 130, 0]);

    expect(salesReport($this, '2026-01-01', '2026-02-15')['range']['group'])->toBe('week')
        ->and(salesReport($this, '2026-01-01', '2026-12-31')['range']['group'])->toBe('month');
});

it('ignores orders that are not paid yet, and an empty range gives zeros', function () {
    $table = DiningTable::where('status', 'inactive')->firstOrFail();
    $this->postJson("/api/tables/{$table->id}/activate", ['guests' => 2])->assertOk();
    $this->postJson("/api/tables/{$table->id}/order", ['items' => [['foodId' => Food::where('name', 'Garlic Rice')->value('id'), 'qty' => 1]]])->assertCreated();

    $today = now('Asia/Manila')->toDateString();
    $r = salesReport($this, $today, $today);
    expect($r['totals']['orders'])->toBe(0)->and($r['totals']['net'])->toEqual(0)->and($r['totals']['avgOrder'])->toEqual(0)
        ->and($r['byPayment'])->toBe([])->and($r['items'])->toBe([]);
});

it('validates the range', function () {
    $this->getJson('/api/reports/sales')->assertUnprocessable();
    $this->getJson('/api/reports/sales?from=2026-11-10&to=2026-11-09')->assertUnprocessable()->assertJsonPath('message', 'The end date must be the same as or after the start date.');
    $this->getJson('/api/reports/sales?from=10-11-2026&to=2026-11-11')->assertUnprocessable();
    $this->getJson('/api/reports/sales?from=2025-01-01&to=2026-11-11')->assertUnprocessable()->assertJsonPath('message', 'Pick a range of 366 days or fewer.');
    $this->getJson('/api/reports/sales?from=2026-11-01&to=2026-11-02&group=hourly')->assertUnprocessable();
});

it('compares with a period you choose, such as the same days last week', function () {
    paidSale($this, ['Garlic Rice' => 2], '2026-11-02 04:00:00'); // Monday last week: 130
    paidSale($this, ['Kare-Kare' => 1], '2026-11-09 04:00:00');   // Monday this week: 560

    $r = $this->getJson('/api/reports/sales?from=2026-11-09&to=2026-11-10&compare_from=2026-11-02&compare_to=2026-11-03')->assertOk()->json('data');
    expect($r['totals']['net'])->toEqual(560)->and($r['previous'])->toMatchArray(['from' => '2026-11-02', 'to' => '2026-11-03', 'orders' => 1, 'net' => 130.0]);
    $this->getJson('/api/reports/sales?from=2026-11-09&to=2026-11-10&compare_from=2026-11-02')->assertUnprocessable();
    $this->getJson('/api/reports/sales?from=2026-11-09&to=2026-11-10&compare_from=2026-11-05&compare_to=2026-11-03')->assertUnprocessable();
});

it('is a module for the Admin and the Manager, not for the other seeded roles', function () {
    $modules = fn (string $role) => Role::where('name', $role)->firstOrFail()->modules;
    expect($modules('Manager'))->toContain('reports')
        ->and($modules('Admin'))->toContain('reports')
        ->and($modules('Waiter'))->not->toContain('reports')
        ->and($modules('Cashier'))->not->toContain('reports')
        ->and($modules('Kitchen staff'))->not->toContain('reports');
    // A role can be given the module in Settings.
    $id = Role::where('name', 'Cashier')->value('id');
    $this->postJson("/api/roles/{$id}", ['name' => 'Cashier', 'modules' => ['orders', 'reports']])->assertOk()->assertJsonPath('data.modules', ['orders', 'reports']);
});
