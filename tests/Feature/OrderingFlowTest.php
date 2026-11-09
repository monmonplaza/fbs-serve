<?php

use App\Models\DiningTable;
use App\Models\Discount;
use App\Models\Food;
use App\Models\Order;
use App\Models\PaymentMethod;
use Database\Seeders\RestaurantSeeder;
use Tests\Support\OrderingHelpers;

/** Several guests, one QR code, ONE order id: every send to the kitchen becomes a round of the session single order. */
uses(OrderingHelpers::class);

beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
    $this->table = DiningTable::where('name', 'Table 4')->firstOrFail();
});

it('every guest send lands in one order', function () {
    $this->add('Garlic Rice', 'Guest 1');
    $this->add('Garlic Rice', 'Guest 2');
    $this->add('Kare-Kare', 'Guest 2');
    $first = $this->postJson($this->url('send'), ['by' => 'Guest 2'])->assertCreated();
    $first->assertJsonPath('data.id', $first->json('data.code'))->assertJsonPath('data.round', 1)->assertJsonPath('data.status', 'queued');
    $this->assertCount(2, $first->json('data.items'));
    $this->assertSame(2, collect($first->json('data.items'))->firstWhere('name', 'Garlic Rice')['qty']);

    $this->add('Halo-Halo', 'Guest 1');
    $second = $this->postJson($this->url('send'), ['by' => 'Guest 1'])->assertCreated();
    $second->assertJsonPath('data.code', $first->json('data.code'))->assertJsonPath('data.round', 2)->assertJsonPath('data.rounds', 2);
    $this->assertSame($first->json('data.code').'-2', $second->json('data.id'));

    $this->assertSame(1, Order::count());
    $this->assertSame('ordering', DiningTable::find($this->table->id)->status);
    $this->getJson($this->url('plate'))->assertJsonCount(0, 'data');
});

it('a stale or foreign token is rejected', function () {
    $this->getJson("/api/public/tables/{$this->table->id}/plate?k=nope")->assertForbidden();
    $this->postJson("/api/public/tables/{$this->table->id}/send?k=nope", ['by' => 'x'])->assertForbidden();
    $this->postJson("/api/tables/{$this->table->id}/clean")->assertOk();
    $this->getJson($this->url('plate'))->assertForbidden()->assertJsonPath('success', false);
});

it('an empty plate cannot be sent and unavailable food cannot be added', function () {
    $this->postJson($this->url('send'), ['by' => 'Guest 1'])->assertUnprocessable()->assertJsonPath('message', 'Your plate is empty');
    $f = Food::where('name', 'Chicharon Bulaklak')->firstOrFail();
    $this->postJson($this->url('plate-lines'), ['foodId' => $f->id, 'by' => 'Guest 1'])->assertUnprocessable()->assertJsonPath('message', 'Chicharon Bulaklak is not available');
});

it('notes keep lines apart and quantity changes work', function () {
    $this->add('Garlic Rice', 'Guest 1');
    $line = $this->getJson($this->url('plate'))->json('data.0.id');
    $this->patchJson($this->url("plate-lines/{$line}"), ['note' => str_repeat('x', 200)])->assertOk();
    $this->assertSame(120, mb_strlen($this->getJson($this->url('plate'))->json('data.0.note')));
    $this->add('Garlic Rice', 'Guest 2');
    $this->patchJson($this->url("plate-lines/{$line}"), ['delta' => -1])->assertOk();
    $this->assertCount(1, $this->getJson($this->url('plate'))->json('data'));
    $r = $this->postJson($this->url('send'), ['by' => 'Guest 2'])->assertCreated();
    $this->assertArrayNotHasKey('note', $r->json('data.items.0'));
});

it('kitchen serve bill and payment with change', function () {
    $this->add('Garlic Rice', 'Guest 1');   // 65
    $a = $this->postJson($this->url('send'), ['by' => 'Guest 1'])->json('data.id');
    $this->add('Garlic Rice', 'Guest 2');
    $b = $this->postJson($this->url('send'), ['by' => 'Guest 2'])->json('data.id');
    $cash = (string) PaymentMethod::where('name', 'Cash')->value('id');

    $this->getJson('/api/kitchen/queue')->assertJsonCount(2, 'data');
    $this->patchJson("/api/orders/{$a}/serve")->assertUnprocessable(); // not out of the kitchen yet
    foreach ([$a, $b] as $id) {
        foreach (['advance', 'advance', 'advance'] as $step) {
            $this->patchJson("/api/orders/{$id}/{$step}")->assertOk();
        }
        $this->patchJson("/api/orders/{$id}/advance")->assertUnprocessable()->assertJsonPath('message', 'This order is already out');
    }
    $this->patchJson("/api/orders/{$a}/serve")->assertOk()->assertJsonPath('data.status', 'served');
    $this->assertSame('ordering', DiningTable::find($this->table->id)->status);

    // The second round is still not served: the bill cannot be paid yet.
    $this->postJson("/api/tables/{$this->table->id}/pay", ['pays' => [['method' => $cash, 'amount' => 130]]])->assertUnprocessable();
    $this->patchJson("/api/orders/{$b}/serve")->assertOk();
    $this->assertSame('eating', DiningTable::find($this->table->id)->status);

    $this->postJson($this->url('bill-out'), ['method' => $cash])->assertOk()->assertJsonPath('data.total', 130);
    $this->assertSame('billout', DiningTable::find($this->table->id)->status);

    $this->postJson("/api/tables/{$this->table->id}/pay", ['pays' => [['method' => $cash, 'amount' => 100]]])->assertUnprocessable()->assertJsonPath('message', 'The payments must add up to ₱130.00');
    $this->postJson("/api/tables/{$this->table->id}/pay", ['pays' => [['method' => $cash, 'amount' => 130, 'received' => 100]]])->assertUnprocessable();
    $this->postJson("/api/tables/{$this->table->id}/pay", ['pays' => [['method' => $cash, 'amount' => 130, 'received' => 200]]])->assertOk()->assertJsonPath('data.table.status', 'cleaning');

    $orders = $this->getJson('/api/orders')->json('data');
    $this->assertCount(2, $orders);
    foreach ($orders as $o) {
        $this->assertSame('paid', $o['status']);
        $this->assertEquals(200, $o['received']);
        $this->assertEquals(70, $o['change']);
        $this->assertEquals(65, $o['payments'][0]['amount']);
    }
    $this->postJson($this->url('send'), ['by' => 'Guest 1'])->assertUnprocessable(); // table is closing
    $this->postJson("/api/tables/{$this->table->id}/clean")->assertOk()->assertJsonPath('data.status', 'inactive')->assertJsonPath('data.token', null);
});

it('discount and split payment add up per round', function () {
    $this->add('Crispy Pata', 'Guest 1');   // 695
    $a = $this->postJson($this->url('send'), ['by' => 'Guest 1'])->json('data.id');
    $this->add('Garlic Rice', 'Guest 1');   // 65
    $b = $this->postJson($this->url('send'), ['by' => 'Guest 1'])->json('data.id');
    foreach ([$a, $b] as $id) {
        foreach (range(1, 3) as $_) {
            $this->patchJson("/api/orders/{$id}/advance");
        } $this->patchJson("/api/orders/{$id}/serve")->assertOk();
    }
    $senior = Discount::where('name', 'Senior citizen')->value('id');
    $cash = (string) PaymentMethod::where('name', 'Cash')->value('id');
    $gcash = (string) PaymentMethod::where('name', 'GCash')->value('id');

    // 760 less 20% = 608
    $this->postJson("/api/orders/{$b}/pay", ['discountId' => $senior, 'pays' => [['method' => $cash, 'amount' => 300], ['method' => $gcash, 'amount' => 308, 'ref' => '1234 567 890123']]])
        ->assertOk()->assertJsonPath('data.count', 2)->assertJsonPath('data.payment', 'split');
    $orders = collect($this->getJson('/api/orders')->json('data'));
    $this->assertEquals(608, $orders->sum(fn ($o) => collect($o['payments'])->sum('amount')));
    $this->assertSame(['name' => 'Senior citizen', 'pct' => 20], $orders[0]['discount']);
    $this->postJson("/api/orders/{$a}/pay", ['pays' => [['method' => $cash, 'amount' => 1]]])->assertUnprocessable()->assertJsonPath('message', 'This order is already paid.');
});

it('the gcash reference is optional and saved when staff enter it', function () {
    $this->add('Garlic Rice', 'Guest 1');   // 65
    $a = $this->postJson($this->url('send'), ['by' => 'Guest 1'])->json('data.id');
    foreach (range(1, 3) as $_) {
        $this->patchJson("/api/orders/{$a}/advance");
    }
    $this->patchJson("/api/orders/{$a}/serve")->assertOk();
    $gcash = (string) PaymentMethod::where('name', 'GCash')->value('id');
    $this->assertTrue((bool) $this->getJson('/api/payment-methods')->json('data.1.needsRef'));

    $this->postJson($this->url('bill-out'), ['method' => $gcash])->assertOk();

    $this->postJson("/api/tables/{$this->table->id}/pay", ['pays' => [['method' => $gcash, 'amount' => 65, 'ref' => '1234 567 890123']]])->assertOk();
    $o = $this->getJson('/api/orders')->json('data.0');
    $this->assertSame('1234 567 890123', $o['payRef']);
    $this->assertNull(collect($this->getJson('/api/tables')->json('data'))->firstWhere('id', (string) $this->table->id)['bill']);
});

it('takeout has its own order and a pickup number', function () {
    $rice = Food::where('name', 'Garlic Rice')->firstOrFail();
    $r = $this->postJson('/api/takeout', ['items' => [['foodId' => $rice->id, 'qty' => 2]], 'customer' => 'Ana', 'phone' => '', 'channel' => 'walkin'])->assertCreated();
    $r->assertJsonPath('data.type', 'takeout')->assertJsonPath('data.pickup', 'TO-001')->assertJsonPath('data.table', null)->assertJsonPath('data.items.0.price', 65);
    $id = $r->json('data.id');
    $this->patchJson("/api/orders/{$id}/ready")->assertUnprocessable();
    foreach (range(1, 3) as $_) {
        $this->patchJson("/api/orders/{$id}/advance")->assertOk();
    }
    $this->patchJson("/api/orders/{$id}/serve")->assertUnprocessable();
    $this->patchJson("/api/orders/{$id}/ready")->assertOk()->assertJsonPath('data.status', 'ready');
    $cash = (string) PaymentMethod::where('name', 'Cash')->value('id');
    $this->postJson("/api/orders/{$id}/pickup", ['pays' => [['method' => $cash, 'amount' => 130]]])->assertOk()->assertJsonPath('data.status', 'paid');
    $this->postJson('/api/takeout', ['items' => [['foodId' => $rice->id, 'qty' => 1]], 'customer' => 'Bo', 'channel' => 'grab', 'ref' => 'G-1'])->assertJsonPath('data.pickup', 'TO-002');
});

it('takeout qr plate places an order', function () {
    $rice = Food::where('name', 'Garlic Rice')->firstOrFail();
    $this->postJson('/api/public/tables/__takeout/plate-lines', ['foodId' => $rice->id, 'by' => 'Guest 1'])->assertOk();
    $this->getJson('/api/public/tables/__takeout/plate')->assertJsonCount(1, 'data');
    $this->postJson('/api/public/takeout', ['name' => 'Cy', 'phone' => '0917'])->assertCreated()->assertJsonPath('data.source', 'qr');
    $this->getJson('/api/public/tables/__takeout/plate')->assertJsonCount(0, 'data');
});

it('staff routes are closed outside local and testing', function () {
    $this->app['env'] = 'production';
    $this->getJson('/api/orders')->assertForbidden();
});

it('a payment method used in an order cannot be deleted', function () {
    $this->add('Garlic Rice', 'Guest 1');
    $a = $this->postJson($this->url('send'), ['by' => 'Guest 1'])->json('data.id');
    foreach (range(1, 3) as $_) {
        $this->patchJson("/api/orders/{$a}/advance");
    }
    $this->patchJson("/api/orders/{$a}/serve")->assertOk();
    $cash = (string) PaymentMethod::where('name', 'Cash')->value('id');
    $maya = (string) PaymentMethod::where('name', 'Maya')->value('id');

    // Asking for the bill with it already blocks the delete.
    $this->postJson($this->url('bill-out'), ['method' => $cash])->assertOk();
    $this->deleteJson("/api/payment-methods/{$cash}")->assertUnprocessable()->assertJsonPath('success', false);

    $this->postJson("/api/tables/{$this->table->id}/pay", ['pays' => [['method' => $cash, 'amount' => 65]]])->assertOk();
    $this->deleteJson("/api/payment-methods/{$cash}")->assertUnprocessable();
    $this->assertNotNull(PaymentMethod::find($cash));

    // One that no order used can still go.
    $this->deleteJson("/api/payment-methods/{$maya}")->assertNoContent();
});

it('keeps the table stay timer settings', function () {
    $this->getJson('/api/settings')->assertOk()->assertJsonPath('data.tableTimerOn', false)->assertJsonPath('data.tableTimerMins', 90);
    $this->patchJson('/api/settings', ['tableTimerOn' => true])->assertOk()->assertJsonPath('data.tableTimerOn', true)->assertJsonPath('data.tableTimerMins', 90);
    $this->patchJson('/api/settings', ['tableTimerMins' => 45])->assertOk();
    $this->getJson('/api/settings')->assertJsonPath('data.tableTimerOn', true)->assertJsonPath('data.tableTimerMins', 45);
    $this->patchJson('/api/settings', ['tableTimerMins' => 0])->assertUnprocessable();
    $this->patchJson('/api/settings', ['tableTimerMins' => 601])->assertUnprocessable();
});

it('a gcash payment can be confirmed without a reference', function () {
    $this->add('Garlic Rice', 'Guest 1');
    $a = $this->postJson($this->url('send'), ['by' => 'Guest 1'])->json('data.id');
    foreach (range(1, 3) as $_) {
        $this->patchJson("/api/orders/{$a}/advance");
    }
    $this->patchJson("/api/orders/{$a}/serve")->assertOk();
    $gcash = (string) PaymentMethod::where('name', 'GCash')->value('id');

    $this->postJson("/api/tables/{$this->table->id}/pay", ['pays' => [['method' => $gcash, 'amount' => 65]]])->assertOk();
    expect($this->getJson('/api/orders')->json('data.0.payRef'))->toBeNull();
});
