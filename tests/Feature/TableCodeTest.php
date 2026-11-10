<?php

use App\Models\DiningTable;
use Database\Seeders\RestaurantSeeder;
use Illuminate\Support\Facades\Cache;

/** One printed QR per table (no token in it). The phone joins with the code the waiter gives each new group. */
beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
    Cache::flush(); // the attempt limit counts per device across requests
    $this->table = DiningTable::where('status', 'inactive')->firstOrFail();
});

it('gives every activation a new 4-digit code and lets the phone join with it', function () {
    $this->postJson("/api/public/tables/{$this->table->id}/join", ['code' => '0000'])
        ->assertStatus(409)->assertJsonPath('message', 'This table is not active yet. Ask your waiter to activate it.');

    $t = $this->postJson("/api/tables/{$this->table->id}/activate", ['guests' => 2])->assertOk()->json('data');
    expect($t['code'])->toMatch('/^\d{4}$/');

    $wrong = $t['code'] === '0000' ? '1111' : '0000';
    $this->postJson("/api/public/tables/{$this->table->id}/join", ['code' => $wrong])
        ->assertUnprocessable()->assertJsonPath('message', 'That code is not right. Ask your waiter for the table code.');
    $token = $this->postJson("/api/public/tables/{$this->table->id}/join", ['code' => $t['code']])->assertOk()->json('data.token');
    expect($token)->toBe($t['token']);
    $this->getJson("/api/public/tables/{$this->table->id}/plate?k={$token}")->assertOk();

    // Cleaning closes the session: the old token and code stop working, and the next group gets a new code.
    $this->postJson("/api/tables/{$this->table->id}/clean")->assertOk();
    $this->getJson("/api/public/tables/{$this->table->id}/plate?k={$token}")->assertForbidden();
    $next = $this->postJson("/api/tables/{$this->table->id}/activate", ['guests' => 4])->assertOk()->json('data');
    expect($next['token'])->not->toBe($token);
    $this->postJson("/api/public/tables/{$this->table->id}/join", ['code' => $next['code']])->assertOk()->assertJsonPath('data.token', $next['token']);
});

it('limits wrong code attempts', function () {
    $this->postJson("/api/tables/{$this->table->id}/activate", ['guests' => 2])->assertOk();
    foreach (range(1, 10) as $_) {
        $this->postJson("/api/public/tables/{$this->table->id}/join", ['code' => 'x'])->assertUnprocessable();
    }
    $this->postJson("/api/public/tables/{$this->table->id}/join", ['code' => 'x'])->assertStatus(429);
});
