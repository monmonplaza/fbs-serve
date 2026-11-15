<?php

namespace App\Http\Resources;

use App\Support\StockService;
use App\Support\StoredFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FoodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $stock = StockService::portionsLeftForRequest()[$this->id] ?? ['all' => null, 'variants' => []];

        return [
            'id' => (string) $this->id,
            'cat' => (string) $this->category_id,
            'name' => $this->name,
            'price' => (float) $this->price,
            'desc' => $this->description,
            'status' => $this->status,
            'tags' => $this->tags ?? [],
            'eta' => (int) $this->eta_minutes,
            'photos' => $this->photos->pluck('path')->map(fn ($p) => StoredFile::url($p))->all(),
            // `variants` is absent (not empty) for a food without variants, as in the mock.
            $this->mergeWhen($this->variants->isNotEmpty(), fn () => [
                'variants' => $this->variants->map(fn ($v) => array_filter([
                    'id' => (string) $v->id, 'name' => $v->name, 'price' => (float) $v->price,
                    'left' => $stock['variants'][$v->id] ?? null,
                ], fn ($x) => $x !== null))->all(),
            ]),
            // Portions left of a dish that has a recipe; absent when it is not tracked. 0 means sold out.
            $this->mergeWhen(($stock['all'] ?? null) !== null, fn () => ['left' => $stock['all']]),
        ];
    }
}
