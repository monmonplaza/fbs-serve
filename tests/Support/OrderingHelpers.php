<?php

namespace Tests\Support;

use App\Models\DiningTable;
use App\Models\Food;

/** Helpers for the guest-phone ordering tests: the seeded Table 4 and its QR token. */
trait OrderingHelpers
{
    public DiningTable $table;

    public string $k = 'abc123';

    public function url(string $path): string
    {
        return "/api/public/tables/{$this->table->id}/{$path}?k={$this->k}";
    }

    public function add(string $food, string $by, ?int $variant = null): void
    {
        $f = Food::where('name', $food)->firstOrFail();
        $this->postJson($this->url('plate-lines'), ['foodId' => $f->id, 'variantId' => $variant, 'by' => $by])->assertOk();
    }
}
