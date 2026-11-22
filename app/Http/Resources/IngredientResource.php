<?php

namespace App\Http\Resources;

use App\Support\StockService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IngredientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Reserved: promised to orders the kitchen has not sent out yet. It leaves the shelf (on hand) at the bump; available is
        // what can still be sold.
        $reserved = round(StockService::reservedForRequest()[$this->id] ?? 0, 3);

        return [
            'id' => (string) $this->id, 'name' => $this->name, 'unit' => $this->unit,
            'onHand' => (float) $this->on_hand, 'reserved' => $reserved, 'available' => round((float) $this->on_hand - $reserved, 3), 'reorderLevel' => (float) $this->reorder_level,
            'cost' => $this->cost === null ? null : (float) $this->cost, 'active' => (bool) $this->active, 'low' => $this->isLow(),
        ];
    }
}
