<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One guest's payment for their own dishes. `guest` is the share key ("Guest 482", "staff" or "table"). */
class OrderGuestPayment extends Model
{
    public $timestamps = false;

    protected $table = 'app_order_guest_payments';

    protected $fillable = ['order_id', 'guest', 'gross', 'discount_name', 'discount_pct', 'amount', 'method', 'reference', 'received', 'change_given', 'paid_at'];

    protected $casts = ['gross' => 'decimal:2', 'discount_pct' => 'decimal:2', 'amount' => 'decimal:2', 'received' => 'decimal:2', 'change_given' => 'decimal:2', 'paid_at' => 'datetime'];
}
