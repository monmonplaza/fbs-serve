<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderPayment extends Model
{
    public $timestamps = false;
    protected $table = 'app_order_payments';
    protected $fillable = ['order_id', 'method', 'amount', 'reference'];
    protected $casts = ['amount' => 'decimal:2'];
}
