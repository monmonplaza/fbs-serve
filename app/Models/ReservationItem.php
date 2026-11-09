<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReservationItem extends Model
{
    public $timestamps = false;

    protected $table = 'app_reservation_items';

    protected $fillable = ['reservation_id', 'food_id', 'variant_id', 'name', 'price', 'qty'];

    protected $casts = ['price' => 'decimal:2'];
}
