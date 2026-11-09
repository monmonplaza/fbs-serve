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
     * What each round paid, so a list of rounds still sums to the order's payments (the last round takes the rounding).
     *
     * @return array<int, array<int, array{method: string, amount: float}>> round id => payment parts
     */
    public static function shares(Order $order): array
    {
        $pct = (float) ($order->discount_pct ?? 0);
        $rounds = $order->rounds->values();
        $totals = $rounds->map(fn (OrderRound $r) => Money::r2($r->subtotal() * (1 - $pct / 100)))->all();
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
