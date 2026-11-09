<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** The single settings row of the restaurant. */
class AppSetting extends Model
{
    protected $table = 'app_settings';

    protected $fillable = ['table_timer_on', 'table_timer_mins'];

    protected $casts = ['table_timer_on' => 'boolean', 'table_timer_mins' => 'integer'];

    public static function current(): self
    {
        return self::query()->firstOrCreate([], ['table_timer_on' => false, 'table_timer_mins' => 90]);
    }
}
