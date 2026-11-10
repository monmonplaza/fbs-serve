<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TableResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $s = $this->openSession;

        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'seats' => (int) $this->seats,
            'floor' => (string) $this->floor_id,
            'x' => (float) $this->x,
            'y' => (float) $this->y,
            'status' => $this->status,
            'token' => $s?->token,
            'code' => $s?->code,
            'openedAt' => $s?->opened_at?->valueOf() ? (int) $s->opened_at->valueOf() : null,
            'bill' => $s?->bill_requested_at ? array_filter(['method' => $s->bill_method, 'at' => (int) $s->bill_requested_at->valueOf()], fn ($v) => $v !== null) : null,
            'guests' => $s?->guests,
        ];
    }
}
