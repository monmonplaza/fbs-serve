<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DiningTable extends Model
{
    protected $table = 'app_dining_tables';
    protected $fillable = ['floor_id', 'name', 'seats', 'x', 'y', 'status'];
    protected $casts = ['x' => 'float', 'y' => 'float'];

    public function floor(): BelongsTo { return $this->belongsTo(Floor::class, 'floor_id'); }
    public function sessions(): HasMany { return $this->hasMany(TableSession::class, 'table_id'); }
    public function openSession(): HasOne { return $this->hasOne(TableSession::class, 'table_id')->whereNull('closed_at')->latestOfMany(); }
}
