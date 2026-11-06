<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => (string) $this->id, 'name' => $this->name, 'details' => $this->details, 'active' => (bool) $this->active, 'needsRef' => (bool) $this->needs_ref, 'qr' => $this->when($this->qr !== null, $this->qr)];
    }
}
