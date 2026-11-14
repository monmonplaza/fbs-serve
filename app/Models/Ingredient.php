<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ingredient extends Model
{
    protected $table = 'app_ingredients';

    protected $fillable = ['name', 'unit', 'on_hand', 'reorder_level', 'cost', 'active'];

    protected $casts = ['on_hand' => 'decimal:3', 'reorder_level' => 'decimal:3', 'cost' => 'decimal:4', 'active' => 'boolean'];

    public function recipeLines(): HasMany
    {
        return $this->hasMany(RecipeLine::class, 'ingredient_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'ingredient_id');
    }

    /** At or under the reorder level (an ingredient with no level set is never "low"; out of stock always is). */
    public function isLow(): bool
    {
        return (float) $this->on_hand <= 0 || ((float) $this->reorder_level > 0 && (float) $this->on_hand <= (float) $this->reorder_level);
    }
}
