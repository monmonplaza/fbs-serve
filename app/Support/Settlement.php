<?php

namespace App\Support;

use App\Exceptions\ApiException;
use App\Models\Discount;
use App\Models\Order;
use App\Models\OrderRound;
use Illuminate\Support\Facades\DB;

/** Payment rules: one bill per order, one discount, a payment list that adds up to the amount due. */
final class Settlement
{
    public static function subtotal(Order $order): float
    {
        return Money::r2($order->rounds->sum(fn (OrderRound $r) => $r->subtotal()));
    }

    public static function due(Order $order, ?float $pct = null): float
    {
        $pct ??= (float) ($order->discount_pct ?? 0);

        return Money::r2(self::subtotal($order) * (1 - $pct / 100));
    }

    /**
     * @param  array<int, array{method: string, amount: float|int|string, received?: float|int|string|null}>  $pays
     */
    public static function pay(Order $order, ?int $discountId, array $pays): Order
    {
        return DB::transaction(function () use ($order, $discountId, $pays) {
            $order = Order::query()->with(['rounds.items'])->lockForUpdate()->findOrFail($order->id);
            if ($order->isPaid()) {
                throw new ApiException('This order is already paid.');
            }
            if ($order->rounds->isEmpty()) {
                throw new ApiException('There is nothing to pay yet.');
            }
            if ($order->guestPayments()->exists()) {
                throw new ApiException('Some guests already paid for their own dishes. Collect the rest guest by guest.');
            }
            if (! $order->isTakeout() && $order->rounds->contains(fn (OrderRound $r) => $r->status !== 'served')) {
                throw new ApiException('Some food is not served yet. Serve every order before taking payment.');
            }

            $discount = $discountId ? Discount::query()->where('active', true)->find($discountId) : null;
            if ($discountId && ! $discount) {
                throw new ApiException('This discount is not available.');
            }
            $pct = (float) ($discount?->pct ?? 0);
            $due = self::due($order, $pct);

            $rows = collect($pays)->map(fn ($p) => [
                'method' => (string) $p['method'], 'amount' => Money::r2($p['amount']),
                'received' => isset($p['received']) ? Money::r2($p['received']) : null,
                'ref' => isset($p['ref']) && trim((string) $p['ref']) !== '' ? mb_substr(trim((string) $p['ref']), 0, 40) : null,
            ]);
            // The reference no. (GCash, Maya, cards) is optional: it is saved when staff enter it.
            if ($rows->isEmpty() || $rows->contains(fn ($r) => ! ($r['amount'] > 0)) || Money::r2($rows->sum('amount') - $due) !== 0.0) {
                throw new ApiException('The payments must add up to '.Money::peso($due));
            }
            $single = $rows->count() === 1;
            if ($single && $rows[0]['received'] !== null && $rows[0]['received'] < $due) {
                throw new ApiException('The amount received is less than the amount due ('.Money::peso($due).')');
            }

            $order->payments()->delete();
            foreach ($rows as $r) {
                $order->payments()->create(['method' => $r['method'], 'amount' => $r['amount'], 'reference' => $r['ref']]);
            }
            $order->update([
                'discount_name' => $discount?->name, 'discount_pct' => $discount ? $pct : null,
                'payment_method' => $single ? $rows[0]['method'] : 'split',
                'received' => $single ? $rows[0]['received'] : null,
                'change_given' => $single && $rows[0]['received'] !== null ? Money::r2($rows[0]['received'] - $due) : null,
                'paid_at' => now(),
            ]);

            return $order->load(['rounds.items', 'payments']);
        });
    }

    /**
     * A table's dishes by who added them (same rules as resources/js/lib/guestShares.ts): "Guest 482" per phone, "staff" for dishes
     * a waiter took, "table" for what nobody claimed. Each key is what that person owes before any discount.
     *
     * @return array<string, float> key => gross
     */
    public static function guestGross(Order $order): array
    {
        $out = [];
        foreach ($order->rounds as $round) {
            foreach ($round->items as $i) {
                $left = (int) $i->qty;
                foreach ((array) ($i->added_by ?? []) as $who => $q) {
                    $take = min((int) $q, $left);
                    if ($take <= 0) {
                        continue;
                    }
                    $left -= $take;
                    $key = preg_match('/^Guest \d+$/i', trim((string) $who)) ? trim((string) $who) : 'staff';
                    $out[$key] = Money::r2(($out[$key] ?? 0) + (float) $i->price * $take);
                }
                if ($left > 0) {
                    $out['table'] = Money::r2(($out['table'] ?? 0) + (float) $i->price * $left);
                }
            }
        }

        return $out;
    }

    /** What each guest still has to pay before any discount (their dishes now, less what they already paid for). */
    public static function guestRemaining(Order $order): array
    {
        $paid = $order->guestPayments->groupBy('guest')->map(fn ($rows) => Money::r2($rows->sum(fn ($p) => (float) $p->gross)));

        return collect(self::guestGross($order))->map(fn ($g, $k) => Money::r2($g - ($paid[$k] ?? 0)))->all();
    }

    /**
     * One guest pays for their own dishes (whole share, one method, their own discount). The order closes once every guest has paid.
     *
     * @param  array{method: string, amount: float|int|string, received?: float|int|string|null, ref?: string|null}  $pay
     */
    public static function payGuest(Order $order, string $guest, ?int $discountId, array $pay): Order
    {
        return DB::transaction(function () use ($order, $guest, $discountId, $pay) {
            $order = Order::query()->with(['rounds.items', 'guestPayments'])->lockForUpdate()->findOrFail($order->id);
            if ($order->isPaid()) {
                throw new ApiException('This order is already paid.');
            }
            if ($order->isTakeout()) {
                throw new ApiException('A takeout order is paid as one.');
            }
            if ($order->rounds->isEmpty() || $order->rounds->contains(fn (OrderRound $r) => $r->status !== 'served')) {
                throw new ApiException('Some food is not served yet. Serve every order before taking payment.');
            }
            $remaining = self::guestRemaining($order);
            $gross = $remaining[$guest] ?? 0.0;
            if (! ($gross > 0)) {
                throw new ApiException('This guest has nothing left to pay.');
            }
            $discount = $discountId ? Discount::query()->where('active', true)->find($discountId) : null;
            if ($discountId && ! $discount) {
                throw new ApiException('This discount is not available.');
            }
            $pct = (float) ($discount?->pct ?? 0);
            $due = Money::r2($gross * (1 - $pct / 100));
            if (Money::r2($pay['amount']) !== $due) {
                throw new ApiException('The payment must be '.Money::peso($due));
            }
            $received = isset($pay['received']) ? Money::r2($pay['received']) : null;
            if ($received !== null && $received < $due) {
                throw new ApiException('The amount received is less than the amount due ('.Money::peso($due).')');
            }
            $ref = isset($pay['ref']) && trim((string) $pay['ref']) !== '' ? mb_substr(trim((string) $pay['ref']), 0, 40) : null;
            $order->guestPayments()->create([
                'guest' => $guest, 'gross' => $gross, 'discount_name' => $discount?->name, 'discount_pct' => $discount ? $pct : null,
                'amount' => $due, 'method' => (string) $pay['method'], 'reference' => $ref,
                'received' => $received, 'change_given' => $received !== null ? Money::r2($received - $due) : null, 'paid_at' => now(),
            ]);

            $order->load('guestPayments');
            if (collect(self::guestRemaining($order))->every(fn ($g) => $g <= 0)) {
                self::closeGuestOrder($order);
            }

            return $order->load(['rounds.items', 'payments', 'guestPayments']);
        });
    }

    /** Every guest has paid: the order gets its payment list (one line per method) and the discounts of all guests together. */
    private static function closeGuestOrder(Order $order): void
    {
        $gp = $order->guestPayments;
        $byMethod = $gp->groupBy('method');
        $order->payments()->delete();
        foreach ($byMethod as $method => $rows) {
            $order->payments()->create([
                'method' => $method, 'amount' => Money::r2($rows->sum(fn ($p) => (float) $p->amount)),
                'reference' => $rows->pluck('reference')->filter()->implode(', ') ?: null,
            ]);
        }
        $discount = Money::r2($gp->sum(fn ($p) => (float) $p->gross) - $gp->sum(fn ($p) => (float) $p->amount));
        $names = $gp->pluck('discount_name')->filter()->unique()->values();
        $order->update([
            'discount_name' => $discount > 0 ? $names->implode(', ') : null,
            'discount_pct' => $discount > 0 && $names->count() === 1 ? $gp->firstWhere('discount_name', '!=', null)->discount_pct : null,
            'discount_total' => $discount,
            'payment_method' => $byMethod->count() === 1 ? $byMethod->keys()->first() : 'split',
            'received' => null, 'change_given' => null, 'paid_at' => now(),
        ]);
    }

    /** What each round pays after the discounts: the percent when there was one bill discount, else the guests' discounts spread over the rounds. */
    public static function roundTotals(Order $order): array
    {
        $subs = $order->rounds->map(fn (OrderRound $r) => Money::r2($r->subtotal()))->all();
        if ($order->discount_total === null) {
            $pct = (float) ($order->discount_pct ?? 0);

            return array_map(fn ($s) => Money::r2($s * (1 - $pct / 100)), $subs);
        }
        $total = Money::r2(array_sum($subs)) ?: 1.0;
        $left = (float) $order->discount_total;
        $out = [];
        foreach ($subs as $i => $s) {
            $off = $i === count($subs) - 1 ? Money::r2($left) : Money::r2((float) $order->discount_total * $s / $total);
            $left = Money::r2($left - $off);
            $out[] = Money::r2($s - $off);
        }

        return $out;
    }

    /**
     * What each round paid, so a list of rounds still sums to the order's payments (the last round takes the rounding).
     *
     * @return array<int, array<int, array{method: string, amount: float}>> round id => payment parts
     */
    public static function shares(Order $order): array
    {
        $rounds = $order->rounds->values();
        $totals = self::roundTotals($order);
        $pays = $order->payments->values();
        if ($pays->isEmpty()) {
            return [];
        }
        $out = [];

        if ($pays->count() === 1) {
            foreach ($rounds as $i => $r) {
                $out[$r->id] = [['method' => $pays[0]->method, 'amount' => $totals[$i]]];
            }

            return $out;
        }
        $grand = Money::r2(array_sum($totals)) ?: 1.0;
        $left = $pays->map(fn ($p) => (float) $p->amount)->all();
        foreach ($rounds as $i => $r) {
            if ($i === $rounds->count() - 1) {
                $out[$r->id] = $pays->map(fn ($p, $j) => ['method' => $p->method, 'amount' => Money::r2($left[$j])])->all();

                continue;
            }
            $rest = $totals[$i];
            $parts = [];
            foreach ($pays as $j => $p) {
                $a = $j === $pays->count() - 1 ? Money::r2($rest) : Money::r2(((float) $p->amount * $totals[$i]) / $grand);
                $rest = Money::r2($rest - $a);
                $left[$j] = Money::r2($left[$j] - $a);
                $parts[] = ['method' => $p->method, 'amount' => $a];
            }
            $out[$r->id] = $parts;
        }

        return $out;
    }
}
