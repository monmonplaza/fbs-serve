<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return array_filter([
            'id' => (string) $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'pax' => (int) $this->pax,
            'at' => (int) $this->starts_at->valueOf(),
            'tableId' => $this->table_id === null ? null : (string) $this->table_id,
            'note' => $this->note,
            'status' => $this->status,
            'order' => $this->items->isEmpty() ? null : $this->items->map(fn ($i) => array_filter([
                'foodId' => (string) $i->food_id, 'variantId' => $i->variant_id === null ? null : (string) $i->variant_id,
                'name' => $i->name, 'price' => (float) $i->price, 'qty' => (int) $i->qty,
            ], fn ($v) => $v !== null))->values()->all(),
            'history' => $this->history->map(fn ($h) => ['at' => (int) $h->at->valueOf(), 'text' => $h->text])->all(),
            'cancelReason' => $this->cancel_reason,
            'dismissed' => (bool) $this->dismissed,
        ], fn ($v, $k) => $v !== null || in_array($k, ['tableId', 'order'], true), ARRAY_FILTER_USE_BOTH);
    }
}
