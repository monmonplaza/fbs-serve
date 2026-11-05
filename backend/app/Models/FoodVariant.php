<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FoodVariant extends Model
{
    public $timestamps = false;
    protected $table = 'app_food_variants';
    protected $fillable = ['food_id', 'name', 'price', 'position'];
    protected $casts = ['price' => 'decimal:2'];
}
