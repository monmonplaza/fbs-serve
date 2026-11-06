<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FoodPhoto extends Model
{
    public $timestamps = false;

    protected $table = 'app_food_photos';

    protected $fillable = ['food_id', 'path', 'position'];
}
