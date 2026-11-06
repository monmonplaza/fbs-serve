<?php

use App\Models\Category;
use App\Models\Food;
use Tests\Support\FoodPayload;

uses(FoodPayload::class);

beforeEach(function () {
    $this->cat = Category::create(['name' => 'Main']);
});

it('create returns the ui shape in the envelope', function () {
    $this->postJson('/api/foods', $this->payload())->assertCreated()
        ->assertJsonPath('success', true)->assertJsonPath('data.name', 'Adobo')->assertJsonPath('data.cat', (string) $this->cat->id)
        ->assertJsonPath('data.price', 200)->assertJsonPath('data.eta', 20)->assertJsonMissingPath('data.variants');
});

it('price is the lowest variant price and names must differ', function () {
    $r = $this->postJson('/api/foods', $this->payload(['price' => 0, 'variants' => [['name' => 'Large', 'price' => 300], ['name' => 'Small', 'price' => 180], ['name' => '', 'price' => 1]]]))->assertCreated();
    $r->assertJsonPath('data.price', 180)->assertJsonCount(2, 'data.variants');

    $this->postJson('/api/foods', $this->payload(['name' => 'Dup', 'variants' => [['name' => 'Small', 'price' => 1], ['name' => 'small', 'price' => 2]]]))
        ->assertUnprocessable()->assertJsonPath('message', 'Each variant needs a different name');
});

it('status can be changed alone and validation errors use the envelope', function () {
    $food = Food::create(['category_id' => $this->cat->id, 'name' => 'Sisig', 'price' => 285, 'eta_minutes' => 18]);
    $this->postJson("/api/foods/{$food->id}", ['status' => 'unavailable'])->assertOk()->assertJsonPath('data.status', 'unavailable')->assertJsonPath('data.price', 285);
    $this->postJson('/api/foods', $this->payload(['name' => '']))->assertUnprocessable()->assertJsonPath('success', false)->assertJsonValidationErrors('name');
});

it('a category in use cannot be deleted', function () {
    Food::create(['category_id' => $this->cat->id, 'name' => 'Sisig', 'price' => 1, 'eta_minutes' => 5]);
    $this->deleteJson("/api/categories/{$this->cat->id}")->assertUnprocessable()->assertJsonPath('errors.in_use.0.count', 1);
    Food::query()->delete();
    $this->deleteJson("/api/categories/{$this->cat->id}")->assertNoContent();
});

it('a payment method keeps its qr image and can clear it', function () {
    $qr = 'data:image/png;base64,iVBORw0KGgo=';
    $id = $this->postJson('/api/payment-methods', ['name' => 'GCash', 'details' => '0917', 'needsRef' => true, 'qr' => $qr])->assertCreated()->assertJsonPath('data.qr', $qr)->json('data.id');
    $this->postJson("/api/payment-methods/{$id}", ['name' => 'GCash', 'details' => '0918', 'needsRef' => true])->assertOk()->assertJsonPath('data.qr', $qr);
    $this->postJson("/api/payment-methods/{$id}", ['name' => 'GCash', 'qr' => ''])->assertOk()->assertJsonMissingPath('data.qr');
});
