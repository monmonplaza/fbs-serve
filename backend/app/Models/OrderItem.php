<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    public $timestamps = false;
    protected $table = 'app_order_items';
    protected $fillable = ['round_id', 'food_id', 'variant_id', 'name', 'price', 'qty', 'note'];
    protected $casts = ['price' => 'decimal:2'];
}
