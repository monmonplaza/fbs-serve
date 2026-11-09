<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReservationHistory extends Model
{
    public $timestamps = false;

    protected $table = 'app_reservation_history';

    protected $fillable = ['reservation_id', 'at', 'text'];

    protected $casts = ['at' => 'datetime'];
}
