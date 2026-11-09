<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    public const LIVE = ['booked', 'arrived'];

    /** Minutes a booking holds its table. */
    public const HOLD_MINUTES = 90;

    protected $table = 'app_reservations';

    protected $fillable = ['name', 'phone', 'pax', 'starts_at', 'table_id', 'note', 'status', 'cancel_reason', 'dismissed'];

    protected $casts = ['starts_at' => 'datetime', 'dismissed' => 'boolean', 'pax' => 'integer'];

    public function table(): BelongsTo
    {
        return $this->belongsTo(DiningTable::class, 'table_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ReservationItem::class, 'reservation_id');
    }

    public function history(): HasMany
    {
        return $this->hasMany(ReservationHistory::class, 'reservation_id')->orderBy('at')->orderBy('id');
    }

    public function log(string $text): void
    {
        $this->history()->create(['at' => now(), 'text' => $text]);
    }
}
