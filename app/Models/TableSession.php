<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class TableSession extends Model
{
    protected $table = 'app_table_sessions';

    protected $fillable = ['table_id', 'token', 'code', 'guests', 'opened_at', 'closed_at', 'bill_method', 'bill_requested_at'];

    protected $casts = ['opened_at' => 'datetime', 'closed_at' => 'datetime', 'bill_requested_at' => 'datetime'];

    /** Attributes for a new session: the token the phone uses after joining, and the 4-digit code the waiter gives the guests. */
    public static function startAttributes(int $guests): array
    {
        return ['token' => Str::lower(Str::random(10)), 'code' => str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT), 'guests' => $guests, 'opened_at' => now()];
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(DiningTable::class, 'table_id');
    }

    public function order(): HasOne
    {
        return $this->hasOne(Order::class, 'session_id');
    }

    public function plateLines(): HasMany
    {
        return $this->hasMany(PlateLine::class, 'session_id');
    }
}
