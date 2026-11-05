<?php

namespace App\Http\Resources;

use App\Services\Settlement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One round of an order, shaped like the UI's `Order` (src/api/types.ts). `id` is the round code (ORD-1001, ORD-1001-2); `code` is the
 * order's single id and `round` says which send this is. Needs `order.rounds.items`, `order.payments`, `order.session` and `items` loaded.
 */
class OrderRoundResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $o = $this->order;
        $paid = $o->isPaid();
        $shares = $paid ? Settlement::shares($o)[$this->id] ?? [] : [];
        $ms = fn ($t) => $t ? (int) $t->valueOf() : null;

        return array_filter([
            'id' => $this->code,
            'code' => $o->code,
            'round' => (int) $this->round_no,
            'rounds' => $o->rounds->count(),
            'table' => $o->table_id ? (string) $o->table_id : null,
            'session' => $o->session?->token,
            'type' => $o->isTakeout() ? 'takeout' : null,
            'pickup' => $o->pickup_code, 'customer' => $o->customer, 'phone' => $o->phone,
            'source' => $o->source, 'channel' => $o->channel, 'ref' => $o->channel_ref,
            'items' => $this->items->map(fn ($i) => array_filter([
                'foodId' => $i->food_id ? (string) $i->food_id : '',
                'variantId' => $i->variant_id ? (string) $i->variant_id : null,
                'name' => $i->name, 'price' => (float) $i->price, 'qty' => (int) $i->qty, 'note' => $i->note,
            ], fn ($v) => $v !== null))->all(),
            'status' => $paid ? 'paid' : $this->status,
            'createdAt' => $ms($this->created_at),
            'servedAt' => $ms($this->served_at), 'readyAt' => $ms($this->ready_at), 'paidAt' => $ms($o->paid_at),
            'by' => $this->created_by,
            'eta' => (int) $this->eta_minutes,
            'payment' => $paid ? $o->payment_method : null,
            'payments' => $paid ? $shares : null,
            // Present (null when no discount) once paid, like the mock.
            'discount' => $paid ? ($o->discount_name ? ['name' => $o->discount_name, 'pct' => (float) $o->discount_pct] : null) : null,
            'payRef' => $paid ? ($o->payments->pluck('reference')->filter()->implode(', ') ?: null) : null,
            'received' => $paid && $o->received !== null ? (float) $o->received : null,
            'change' => $paid && $o->change_given !== null ? (float) $o->change_given : null,
        ], fn ($v, $k) => $v !== null || $k === 'discount' && $paid, ARRAY_FILTER_USE_BOTH);
    }
}
