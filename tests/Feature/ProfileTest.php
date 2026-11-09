<?php

use App\Models\User;
use Database\Seeders\RestaurantSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
    $this->user = User::where('username', 'jun')->firstOrFail();
});

it('saves the profile details and the photo, and deletes a replaced photo', function () {
    config(['filesystems.default' => 's3', 'filesystems.disks.s3.folder' => 'fbs-serve']);
    Storage::fake('s3');
    $up = fn () => $this->post('/api/uploads', ['file' => UploadedFile::fake()->image('me.jpg'), 'folder' => 'avatars'], ['Accept' => 'application/json'])->json('data');
    $first = $up();

    $this->postJson("/api/users/{$this->user->id}/profile", [
        'name' => ' Jun Reyes ', 'email' => 'jun@example.com', 'phone' => '+63 917 555 0101', 'address' => '12 Rizal St., Makati', 'avatar' => $first['url'],
    ])->assertOk()->assertJsonPath('data.name', 'Jun Reyes')->assertJsonPath('data.phone', '+63 917 555 0101')
        ->assertJsonPath('data.address', '12 Rizal St., Makati')->assertJsonPath('data.email', 'jun@example.com');
    expect($this->user->refresh()->avatar)->toBe($first['path']);

    $second = $up();
    $this->postJson("/api/users/{$this->user->id}/profile", ['name' => 'Jun Reyes', 'avatar' => $second['url']])->assertOk()->assertJsonMissingPath('data.email');
    Storage::disk('s3')->assertMissing($first['path']);
    expect($this->user->refresh())->phone->toBeNull()->avatar->toBe($second['path']);
});

it('validates the email and contact number', function () {
    $other = User::where('username', 'maria')->firstOrFail();
    $other->update(['email' => 'maria@example.com']);
    $this->postJson("/api/users/{$this->user->id}/profile", ['name' => 'Jun', 'email' => 'maria@example.com'])->assertUnprocessable()->assertJsonValidationErrors('email');
    $this->postJson("/api/users/{$this->user->id}/profile", ['name' => 'Jun', 'phone' => 'call me'])->assertUnprocessable()->assertJsonValidationErrors('phone');
    $this->postJson("/api/users/{$this->user->id}/profile", ['name' => ''])->assertUnprocessable()->assertJsonValidationErrors('name');
});

it('sets a first password, then needs the current one to change it', function () {
    $this->getJson('/api/users')->assertOk();
    $this->postJson("/api/users/{$this->user->id}/password", ['password' => 'short', 'password_confirmation' => 'short'])->assertUnprocessable();
    $this->postJson("/api/users/{$this->user->id}/password", ['password' => 'first-pass-1', 'password_confirmation' => 'other-pass-1'])->assertUnprocessable();
    $this->postJson("/api/users/{$this->user->id}/password", ['password' => 'first-pass-1', 'password_confirmation' => 'first-pass-1'])
        ->assertOk()->assertJsonPath('data.hasPassword', true);
    expect(Hash::check('first-pass-1', $this->user->refresh()->password))->toBeTrue();

    $this->postJson("/api/users/{$this->user->id}/password", ['password' => 'second-pass-2', 'password_confirmation' => 'second-pass-2'])->assertUnprocessable();
    $this->postJson("/api/users/{$this->user->id}/password", ['currentPassword' => 'wrong', 'password' => 'second-pass-2', 'password_confirmation' => 'second-pass-2'])
        ->assertUnprocessable()->assertJsonPath('message', 'The current password is not correct.');
    $this->postJson("/api/users/{$this->user->id}/password", ['currentPassword' => 'first-pass-1', 'password' => 'second-pass-2', 'password_confirmation' => 'second-pass-2'])->assertOk();
    expect(Hash::check('second-pass-2', $this->user->refresh()->password))->toBeTrue();
});
