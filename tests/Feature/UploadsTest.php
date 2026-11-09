<?php

use App\Models\Food;
use App\Models\PaymentMethod;
use Database\Seeders\RestaurantSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RestaurantSeeder::class);
    config(['filesystems.default' => 's3', 'filesystems.disks.s3.folder' => 'fbs-serve']);
    Storage::fake('s3');
});

function upload(string $folder, string $name = 'pic.png'): array
{
    return test()->post('/api/uploads', ['file' => UploadedFile::fake()->image($name, 300, 300), 'folder' => $folder], ['Accept' => 'application/json'])
        ->assertCreated()->json('data');
}

it('stores an uploaded picture privately under the project folder and returns a link', function () {
    ['path' => $path, 'url' => $url] = upload('payments');

    expect($path)->toStartWith('fbs-serve/payments/')->and($url)->not->toBe($path);
    Storage::disk('s3')->assertExists($path);
});

it('rejects files that are not pictures and unknown folders', function () {
    $this->post('/api/uploads', ['file' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'), 'folder' => 'payments'], ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('file');
    $this->post('/api/uploads', ['file' => UploadedFile::fake()->image('a.png'), 'folder' => 'secrets'], ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('folder');
});

it('saves the path behind the link, shows a link, and deletes the old QR when replaced or deleted', function () {
    $first = upload('payments');
    $id = $this->postJson('/api/payment-methods', ['name' => 'ShopeePay', 'qr' => $first['url']])->assertCreated()->json('data.id');
    expect(PaymentMethod::find($id)->qr)->toBe($first['path']);
    expect(collect($this->getJson('/api/payment-methods')->json('data'))->firstWhere('id', (string) $id)['qr'])->not->toBe($first['path']);

    // Saving the form again with the link it was given keeps the same file.
    $shown = collect($this->getJson('/api/payment-methods')->json('data'))->firstWhere('id', (string) $id)['qr'];
    $this->postJson("/api/payment-methods/{$id}", ['name' => 'ShopeePay', 'qr' => $shown])->assertOk();
    expect(PaymentMethod::find($id)->qr)->toBe($first['path']);
    Storage::disk('s3')->assertExists($first['path']);

    $second = upload('payments');
    $this->postJson("/api/payment-methods/{$id}", ['name' => 'ShopeePay', 'qr' => $second['url']])->assertOk();
    Storage::disk('s3')->assertMissing($first['path']);
    Storage::disk('s3')->assertExists($second['path']);

    $this->deleteJson("/api/payment-methods/{$id}")->assertNoContent();
    Storage::disk('s3')->assertMissing($second['path']);
});

it('deletes food photos that were removed and keeps pictures hosted elsewhere', function () {
    $food = Food::where('name', 'Garlic Rice')->firstOrFail();
    [$a, $b] = [upload('foods', 'a.jpg'), upload('foods', 'b.jpg')];
    $elsewhere = 'https://example.com/elsewhere.jpg';

    $this->postJson("/api/foods/{$food->id}", ['photos' => [$a['url'], $b['url']]])->assertOk();
    expect($food->photos()->pluck('path')->all())->toBe([$a['path'], $b['path']]);

    $this->postJson("/api/foods/{$food->id}", ['photos' => [$b['url'], $elsewhere]])->assertOk()->assertJsonPath('data.photos.1', $elsewhere);
    expect($food->photos()->pluck('path')->all())->toBe([$b['path'], $elsewhere]);
    Storage::disk('s3')->assertMissing($a['path']);
    Storage::disk('s3')->assertExists($b['path']);
});
