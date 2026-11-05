<?php

namespace App\Services;

final class Money
{
    public static function r2(float|int|string $v): float
    {
        return round((float) $v, 2);
    }

    public static function peso(float $v): string
    {
        return '₱'.number_format($v, 2);
    }
}
