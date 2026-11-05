<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** One order per table session (or per takeout). Each send to the kitchen is a round of it. */
class Order extends Model
{
    protected $table = 'app_orders';
    protected $fillable = [
        'code', 'session_id', 'table_id', 'type', 'created_by', 'discount_name', 'discount_pct', 'payment_method', 'received', 'change_given', 'paid_at',
        'pickup_code', 'customer', 'phone', 'source', 'channel', 'channel_ref',
    ];
    protected $casts = ['discount_pct' => 'decimal:2', 'received' => 'decimal:2', 'change_given' => 'decimal:2', 'paid_at' => 'datetime'];

    public function rounds(): HasMany { return $this->hasMany(OrderRound::class, 'order_id')->orderBy('round_no'); }
    public function payments(): HasMany { return $this->hasMany(OrderPayment::class, 'order_id'); }
    public function session(): BelongsTo { return $this->belongsTo(TableSession::class, 'session_id'); }
    public function table(): BelongsTo { return $this->belongsTo(DiningTable::class, 'table_id'); }

    public function isTakeout(): bool { return $this->type === 'takeout'; }
    public function isPaid(): bool { return $this->paid_at !== null; }
}
