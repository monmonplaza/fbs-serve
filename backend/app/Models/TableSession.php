<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TableSession extends Model
{
    protected $table = 'app_table_sessions';
    protected $fillable = ['table_id', 'token', 'guests', 'opened_at', 'closed_at', 'bill_method', 'bill_requested_at'];
    protected $casts = ['opened_at' => 'datetime', 'closed_at' => 'datetime', 'bill_requested_at' => 'datetime'];

    public function table(): BelongsTo { return $this->belongsTo(DiningTable::class, 'table_id'); }
    public function order(): HasOne { return $this->hasOne(Order::class, 'session_id'); }
    public function plateLines(): HasMany { return $this->hasMany(PlateLine::class, 'session_id'); }
}
