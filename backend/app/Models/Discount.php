<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Discount extends Model
{
    protected $table = 'app_discounts';
    protected $fillable = ['name', 'pct', 'note', 'active'];
    protected $casts = ['pct' => 'decimal:2', 'active' => 'boolean'];
}
