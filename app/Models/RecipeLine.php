<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecipeLine extends Model
{
    public $timestamps = false;

    protected $table = 'app_recipe_lines';

    protected $fillable = ['food_id', 'variant_id', 'ingredient_id', 'qty'];

    protected $casts = ['qty' => 'decimal:3'];

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'ingredient_id');
    }
}
