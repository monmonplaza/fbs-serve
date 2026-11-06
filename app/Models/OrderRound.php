<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrderRound extends Model
{
    /** Statuses the kitchen is still working on. */
    public const KITCHEN = ['queued', 'cooking', 'plating', 'completed'];

    protected $table = 'app_order_rounds';

    protected $fillable = ['order_id', 'round_no', 'code', 'status', 'created_by', 'eta_minutes', 'ready_at', 'served_at'];

    protected $casts = ['ready_at' => 'datetime', 'served_at' => 'datetime'];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'round_id');
    }

    public function subtotal(): float
    {
        return round($this->items->sum(fn ($i) => (float) $i->price * $i->qty), 2);
    }
}
