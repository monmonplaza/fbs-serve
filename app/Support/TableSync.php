<?php

namespace App\Support;

use App\Models\DiningTable;
use App\Models\OrderRound;

/** Active, ordering or eating follows the rounds of the open session. Bill out and cleaning are set by actions only. */
final class TableSync
{
    public static function sync(DiningTable $table): void
    {
        $table->refresh();
        if (in_array($table->status, ['inactive', 'billout', 'cleaning'], true)) {
            return;
        }

        $rounds = $table->openSession?->order?->rounds()->get() ?? collect();
        $table->status = $rounds->isEmpty() ? 'active'
            : ($rounds->contains(fn (OrderRound $r) => in_array($r->status, OrderRound::KITCHEN, true)) ? 'ordering' : 'eating');
        $table->save();
    }
}
