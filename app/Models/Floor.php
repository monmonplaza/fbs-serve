<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Floor extends Model
{
    protected $table = 'app_floors';

    protected $fillable = ['name'];

    public function tables(): HasMany
    {
        return $this->hasMany(DiningTable::class, 'floor_id');
    }
}
