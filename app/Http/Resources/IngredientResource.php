<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IngredientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id, 'name' => $this->name, 'unit' => $this->unit,
            'onHand' => (float) $this->on_hand, 'reorderLevel' => (float) $this->reorder_level,
            'cost' => $this->cost === null ? null : (float) $this->cost, 'active' => (bool) $this->active, 'low' => $this->isLow(),
        ];
    }
}
