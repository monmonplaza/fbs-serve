<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlateLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return array_filter([
            'id' => (string) $this->id, 'foodId' => (string) $this->food_id, 'variantId' => $this->variant_id ? (string) $this->variant_id : null,
            'qty' => (int) $this->qty, 'by' => $this->added_by, 'note' => $this->note,
        ], fn ($v) => $v !== null);
    }
}
