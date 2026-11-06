<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlateLine extends Model
{
    protected $table = 'app_plate_lines';

    protected $fillable = ['session_id', 'takeout_token', 'food_id', 'variant_id', 'qty', 'added_by', 'note'];

    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class, 'food_id');
    }
}
