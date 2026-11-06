<?php

namespace Tests\Support;

use App\Models\Category;

/** A valid food request body for the Main category created in the test's beforeEach. */
trait FoodPayload
{
    public Category $cat;

    public function payload(array $over = []): array
    {
        return array_merge(['cat' => (string) $this->cat->id, 'name' => 'Adobo', 'price' => 200, 'eta' => 20, 'desc' => 'Soy and vinegar', 'status' => 'available', 'tags' => ['best'], 'photos' => [], 'variants' => []], $over);
    }
}
