<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FoodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'cat' => (string) $this->category_id,
            'name' => $this->name,
            'price' => (float) $this->price,
            'desc' => $this->description,
            'status' => $this->status,
            'tags' => $this->tags ?? [],
            'eta' => (int) $this->eta_minutes,
            'photos' => $this->photos->pluck('path')->all(),
            // `variants` is absent (not empty) for a food without variants, as in the mock.
            $this->mergeWhen($this->variants->isNotEmpty(), fn () => [
                'variants' => $this->variants->map(fn ($v) => ['id' => (string) $v->id, 'name' => $v->name, 'price' => (float) $v->price])->all(),
            ]),
        ];
    }
}
