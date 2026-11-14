<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Food extends Model
{
    protected $table = 'app_foods';

    protected $fillable = ['category_id', 'name', 'price', 'description', 'status', 'eta_minutes', 'tags'];

    protected $casts = ['price' => 'decimal:2', 'tags' => 'array'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(FoodVariant::class, 'food_id')->orderBy('position')->orderBy('id');
    }

    public function recipeLines(): HasMany
    {
        return $this->hasMany(RecipeLine::class, 'food_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(FoodPhoto::class, 'food_id')->orderBy('position')->orderBy('id');
    }

    /** Price a guest pays for one unit, honouring the chosen variant (first variant when none is given). */
    public function unitPrice(?int $variantId): float
    {
        if ($this->variants->isEmpty()) {
            return (float) $this->price;
        }
        $v = $this->variants->firstWhere('id', $variantId) ?? $this->variants->first();

        return (float) $v->price;
    }

    public function itemName(?int $variantId): string
    {
        if ($this->variants->isEmpty()) {
            return $this->name;
        }
        $v = $this->variants->firstWhere('id', $variantId) ?? $this->variants->first();

        return "{$this->name} ({$v->name})";
    }
}
