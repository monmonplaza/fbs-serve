<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Food;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FoodCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cat = Category::create(['name' => 'Main']);
    }

    private Category $cat;

    private function payload(array $over = []): array
    {
        return array_merge(['cat' => (string) $this->cat->id, 'name' => 'Adobo', 'price' => 200, 'eta' => 20, 'desc' => 'Soy and vinegar', 'status' => 'available', 'tags' => ['best'], 'photos' => [], 'variants' => []], $over);
    }

    public function test_create_returns_the_ui_shape_in_the_envelope(): void
    {
        $this->postJson('/api/foods', $this->payload())->assertCreated()
            ->assertJsonPath('success', true)->assertJsonPath('data.name', 'Adobo')->assertJsonPath('data.cat', (string) $this->cat->id)
            ->assertJsonPath('data.price', 200)->assertJsonPath('data.eta', 20)->assertJsonMissingPath('data.variants');
    }

    public function test_price_is_the_lowest_variant_price_and_names_must_differ(): void
    {
        $r = $this->postJson('/api/foods', $this->payload(['price' => 0, 'variants' => [['name' => 'Large', 'price' => 300], ['name' => 'Small', 'price' => 180], ['name' => '', 'price' => 1]]]))->assertCreated();
        $r->assertJsonPath('data.price', 180)->assertJsonCount(2, 'data.variants');

        $this->postJson('/api/foods', $this->payload(['name' => 'Dup', 'variants' => [['name' => 'Small', 'price' => 1], ['name' => 'small', 'price' => 2]]]))
            ->assertUnprocessable()->assertJsonPath('message', 'Each variant needs a different name');
    }

    public function test_status_can_be_changed_alone_and_validation_errors_use_the_envelope(): void
    {
        $food = Food::create(['category_id' => $this->cat->id, 'name' => 'Sisig', 'price' => 285, 'eta_minutes' => 18]);
        $this->postJson("/api/foods/{$food->id}", ['status' => 'unavailable'])->assertOk()->assertJsonPath('data.status', 'unavailable')->assertJsonPath('data.price', 285);
        $this->postJson('/api/foods', $this->payload(['name' => '']))->assertUnprocessable()->assertJsonPath('success', false)->assertJsonValidationErrors('name');
    }

    public function test_a_category_in_use_cannot_be_deleted(): void
    {
        Food::create(['category_id' => $this->cat->id, 'name' => 'Sisig', 'price' => 1, 'eta_minutes' => 5]);
        $this->deleteJson("/api/categories/{$this->cat->id}")->assertUnprocessable()->assertJsonPath('errors.in_use.0.count', 1);
        Food::query()->delete();
        $this->deleteJson("/api/categories/{$this->cat->id}")->assertNoContent();
    }

    public function test_a_payment_method_keeps_its_qr_image_and_can_clear_it(): void
    {
        $qr = 'data:image/png;base64,iVBORw0KGgo=';
        $id = $this->postJson('/api/payment-methods', ['name' => 'GCash', 'details' => '0917', 'needsRef' => true, 'qr' => $qr])->assertCreated()->assertJsonPath('data.qr', $qr)->json('data.id');
        $this->postJson("/api/payment-methods/{$id}", ['name' => 'GCash', 'details' => '0918', 'needsRef' => true])->assertOk()->assertJsonPath('data.qr', $qr);
        $this->postJson("/api/payment-methods/{$id}", ['name' => 'GCash', 'qr' => ''])->assertOk()->assertJsonMissingPath('data.qr');
    }
}
