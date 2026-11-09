<?php

use App\Models\DiningTable;
use App\Models\Food;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\RestaurantSeeder;

beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
});

// ---------- Roles ----------
it('lists, creates, edits and deletes a role', function () {
    $this->getJson('/api/roles')->assertOk()->assertJsonPath('data.0.admin', true)->assertJsonCount(5, 'data');

    $id = $this->postJson('/api/roles', ['name' => 'Host', 'modules' => ['tables', 'reservations', 'tables']])
        ->assertCreated()->assertJsonPath('data.modules', ['tables', 'reservations'])->json('data.id');
    $this->postJson("/api/roles/{$id}", ['name' => 'Head host', 'modules' => ['tables']])->assertOk()->assertJsonPath('data.name', 'Head host');
    $this->postJson('/api/roles', ['name' => 'Head host', 'modules' => []])->assertUnprocessable();
    $this->postJson('/api/roles', ['name' => 'Odd', 'modules' => ['payroll']])->assertUnprocessable();
    $this->deleteJson("/api/roles/{$id}")->assertNoContent();
});

it('a role that has users, and the Admin role, cannot be deleted', function () {
    $waiter = Role::where('name', 'Waiter')->value('id');
    $this->deleteJson("/api/roles/{$waiter}")->assertUnprocessable()->assertJsonPath('message', '2 users have this role. Give them another role first.');
    $admin = Role::where('is_admin', true)->value('id');
    $this->deleteJson("/api/roles/{$admin}")->assertUnprocessable();
    $this->assertNotNull(Role::find($waiter));
});

// ---------- Users ----------
it('creates, edits and deletes a user', function () {
    $role = (string) Role::where('name', 'Cashier')->value('id');
    $id = $this->postJson('/api/users', ['name' => 'Ana Cruz', 'username' => 'ana', 'role' => $role])
        ->assertCreated()->assertJsonPath('data.username', 'ana')->assertJsonPath('data.active', true)->assertJsonPath('data.role', $role)->json('data.id');
    $this->postJson("/api/users/{$id}", ['name' => 'Ana C.', 'username' => 'ana', 'role' => $role, 'active' => false])->assertOk()->assertJsonPath('data.active', false);
    $this->postJson("/api/users/{$id}", ['name' => 'Ana Cruz'])->assertOk()->assertJsonPath('data.username', 'ana'); // profile rename only
    $this->postJson('/api/users', ['name' => 'Dup', 'username' => 'ana', 'role' => $role])->assertUnprocessable();
    $this->postJson('/api/users', ['name' => 'Bad', 'username' => 'no spaces', 'role' => $role])->assertUnprocessable();
    $this->postJson('/api/users', ['name' => 'Nobody', 'username' => 'nobody', 'role' => '999'])->assertUnprocessable();
    $this->deleteJson("/api/users/{$id}")->assertNoContent();
});

it('the last active admin cannot be removed, deactivated or demoted', function () {
    $maria = User::where('username', 'maria')->firstOrFail();
    $waiter = (string) Role::where('name', 'Waiter')->value('id');
    $this->deleteJson("/api/users/{$maria->id}")->assertUnprocessable();
    $this->postJson("/api/users/{$maria->id}", ['active' => false])->assertUnprocessable();
    $this->postJson("/api/users/{$maria->id}", ['role' => $waiter])->assertUnprocessable();

    // With a second admin it is fine.
    $admin = (string) Role::where('is_admin', true)->value('id');
    $this->postJson('/api/users', ['name' => 'Second', 'username' => 'second', 'role' => $admin])->assertCreated();
    $this->postJson("/api/users/{$maria->id}", ['role' => $waiter])->assertOk();
});

// ---------- Reservations ----------
function booking(array $over = []): array
{
    $table = DiningTable::where('name', 'Table 4')->firstOrFail();

    return array_merge(['name' => 'Cruz', 'phone' => '0917', 'pax' => 3, 'at' => now()->addDays(3)->setTime(19, 0)->valueOf(), 'tableId' => (string) $table->id, 'note' => '', 'order' => null], $over);
}

it('books, edits and lists a reservation', function () {
    Reservation::query()->delete();
    $r = $this->postJson('/api/reservations', booking())->assertCreated()->assertJsonPath('data.status', 'booked')->assertJsonPath('data.order', null)->assertJsonPath('data.history.0.text', 'Booked');
    $id = $r->json('data.id');
    $this->postJson("/api/reservations/{$id}", booking(['name' => 'Cruz family', 'pax' => 4]))->assertOk()->assertJsonPath('data.name', 'Cruz family')->assertJsonPath('data.history.1.text', 'Edited');
    $this->getJson('/api/reservations')->assertJsonCount(1, 'data');
    $this->postJson('/api/reservations', booking(['name' => '']))->assertUnprocessable();
});

it('keeps the advance order with menu names and prices', function () {
    $f = Food::where('name', 'Garlic Rice')->firstOrFail();
    $r = $this->postJson('/api/reservations', booking(['order' => [['foodId' => (string) $f->id, 'qty' => 2, 'price' => 1, 'name' => 'Hacked']]]))->assertCreated();
    $this->assertSame('Garlic Rice', $r->json('data.order.0.name'));
    $this->assertEquals($f->price, $r->json('data.order.0.price'));
    $this->postJson('/api/reservations/'.$r->json('data.id'), booking(['order' => null]))->assertJsonPath('data.order', null);
});

it('refuses a table that is too small or already booked', function () {
    Reservation::query()->delete();
    $at = now()->addDays(2)->setTime(18, 0);
    $this->postJson('/api/reservations', booking(['at' => $at->valueOf()]))->assertCreated();
    $this->postJson('/api/reservations', booking(['name' => 'Other', 'at' => $at->copy()->addMinutes(60)->valueOf()]))->assertUnprocessable();
    $this->postJson('/api/reservations', booking(['name' => 'Later', 'at' => $at->copy()->addMinutes(90)->valueOf()]))->assertCreated();
    $this->postJson('/api/reservations', booking(['pax' => 5, 'at' => $at->copy()->addDay()->valueOf()]))->assertUnprocessable()->assertJsonPath('message', 'Table 4 seats only 4.');
});

it('reschedules, cancels, marks no-show, restores and dismisses', function () {
    Reservation::query()->delete();
    $id = $this->postJson('/api/reservations', booking())->json('data.id');
    $new = (int) now()->addDays(4)->setTime(12, 0)->valueOf();

    $this->patchJson("/api/reservations/{$id}/move", ['at' => $new, 'tableId' => null, 'reason' => 'Guest asked'])->assertOk()->assertJsonPath('data.at', $new)->assertJsonPath('data.tableId', null);
    $this->patchJson("/api/reservations/{$id}/move", ['at' => $new, 'tableId' => null])->assertUnprocessable()->assertJsonPath('message', 'Pick a different date, time or table');

    $day = now()->addDays(6)->startOfDay()->valueOf();
    $moved = $this->patchJson("/api/reservations/{$id}/move-day", ['day' => $day])->assertOk()->json('data.at');
    $this->assertSame('12:00', Carbon::createFromTimestampMs($moved)->format('H:i'));
    $this->assertSame(now()->addDays(6)->toDateString(), Carbon::createFromTimestampMs($moved)->toDateString());

    $this->patchJson("/api/reservations/{$id}/cancel", ['reason' => 'Changed plans'])->assertOk()->assertJsonPath('data.status', 'cancelled')->assertJsonPath('data.cancelReason', 'Changed plans');
    $this->patchJson("/api/reservations/{$id}/restore")->assertOk()->assertJsonPath('data.status', 'booked')->assertJsonPath('data.dismissed', false);
    $this->patchJson("/api/reservations/{$id}/no-show")->assertOk()->assertJsonPath('data.status', 'noshow');
    $this->patchJson("/api/reservations/{$id}/restore")->assertOk();
    $this->patchJson("/api/reservations/{$id}/dismiss")->assertOk();
    $this->getJson('/api/reservations')->assertJsonPath('data.0.dismissed', true);
});

it('seating activates the table and puts the advance order on its plate', function () {
    Reservation::query()->delete();
    $f = Food::where('name', 'Garlic Rice')->firstOrFail();
    $id = $this->postJson('/api/reservations', booking(['tableId' => null, 'order' => [['foodId' => (string) $f->id, 'qty' => 2]]]))->json('data.id');
    $free = DiningTable::where('name', 'Table 5')->firstOrFail();
    $busy = DiningTable::where('name', 'Table 4')->firstOrFail(); // seeded as seated

    $this->postJson("/api/reservations/{$id}/seat", ['tableId' => (string) $busy->id])->assertUnprocessable()->assertJsonPath('message', 'That table is in use');
    $r = $this->postJson("/api/reservations/{$id}/seat", ['tableId' => (string) $free->id])->assertOk();
    $r->assertJsonPath('data.reservation.status', 'arrived')->assertJsonPath('data.reservation.tableId', (string) $free->id)->assertJsonPath('data.table.status', 'active')->assertJsonPath('data.table.guests', 3);

    $token = $r->json('data.table.token');
    $this->getJson("/api/public/tables/{$free->id}/plate?k={$token}")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.qty', 2);
    $this->postJson("/api/reservations/{$id}/seat", ['tableId' => (string) $free->id])->assertUnprocessable()->assertJsonPath('message', 'Only booked reservations can be seated');
});
