<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'app_stock_movements';

    protected $fillable = ['ingredient_id', 'type', 'qty', 'balance', 'note', 'ref', 'by'];

    protected $casts = ['qty' => 'decimal:3', 'balance' => 'decimal:3'];

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'ingredient_id');
    }
}
