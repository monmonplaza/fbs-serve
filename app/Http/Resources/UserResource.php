<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return array_filter([
            'id' => (string) $this->id,
            'name' => $this->name,
            'username' => (string) $this->username,
            'role' => $this->role_id === null ? '' : (string) $this->role_id,
            'active' => (bool) $this->active,
            'email' => $this->email,
        ], fn ($v) => $v !== null);
    }
}
