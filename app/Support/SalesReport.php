<?php

namespace App\Support;

use App\Models\PaymentMethod;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Sales for a date range, counted on the day an order was PAID, in the restaurant's time zone (the database keeps UTC).
 * An order's amounts follow the bill: gross is the items, net is gross minus the discount (VAT included in net), rounded the same
 * way as the payment screen.
 */
final class SalesReport
{
    public const VAT_RATE = 0.12;

    private const CHANNELS = ['dine_in' => 'Dine-in', 'walkin' => 'Takeout', 'grab' => 'GrabFood', 'panda' => 'Foodpanda'];

    /**
     * @param  array{0: CarbonImmutable, 1: CarbonImmutable}|null  $compare  The period to compare with; by default the same number of days right before.
     * @return array<string, mixed>
     */
    public static function build(CarbonImmutable $from, CarbonImmutable $to, string $group, ?array $compare = null): array
    {
        $tz = $from->getTimezone();
        $now = self::load($from->startOfDay(), $to->endOfDay());
        $days = (int) $from->startOfDay()->diffInDays($to->startOfDay()) + 1;
        [$prevFrom, $prevTo] = $compare ?? [$from->startOfDay()->subDays($days), $from->startOfDay()->subDay()];

        return [
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'days' => $days, 'group' => $group, 'timezone' => $tz->getName()],
            'totals' => self::totals($now),
            'previous' => ['from' => $prevFrom->toDateString(), 'to' => $prevTo->toDateString()] + self::totals(self::load($prevFrom->startOfDay(), $prevTo->endOfDay())),
            'series' => self::series($now, $from, $to, $group),
            'byHour' => self::byHour($now),
            'byPayment' => self::byPayment($now),
            'byChannel' => self::byChannel($now),
            'byCategory' => self::byCategory($now),
            'items' => self::items($now),
            'byTable' => self::byTable($now),
            'discounts' => self::discounts($now),
            'open' => self::open($from->startOfDay(), $to->endOfDay()),
        ];
    }

    /**
     * Orders placed in the range that are not paid yet. They are not sales until the bill is paid (a sale is counted on the day it
     * is paid), so the report lists them apart: they will appear in the totals on the day they are paid. Amounts are before any
     * discount, which is chosen when the bill is paid.
     *
     * @return array{orders: int, amount: float, list: array<int, array{code: string, table: ?string, at: int, amount: float}>}
     */
    private static function open(CarbonInterface $start, CarbonInterface $end): array
    {
        $a = $start->clone()->utc()->format('Y-m-d H:i:s');
        $b = $end->clone()->utc()->format('Y-m-d H:i:s');
        $orders = DB::table('app_orders as o')
            ->leftJoin('app_dining_tables as t', 't.id', '=', 'o.table_id')
            ->whereNull('o.paid_at')->where('o.created_at', '>=', $a)->where('o.created_at', '<=', $b)
            ->orderByDesc('o.id')->get(['o.id', 'o.code', 'o.type', 'o.pickup_code', 't.name as table_name', 'o.created_at']);
        if ($orders->isEmpty()) {
            return ['orders' => 0, 'amount' => 0.0, 'list' => []];
        }
        $amounts = DB::table('app_order_items as oi')->join('app_order_rounds as r', 'r.id', '=', 'oi.round_id')
            ->whereIn('r.order_id', $orders->pluck('id'))->get(['r.order_id', 'oi.price', 'oi.qty'])
            ->groupBy('order_id')->map(fn ($rows) => Money::r2($rows->sum(fn ($i) => (float) $i->price * (int) $i->qty)));
        $list = $orders->map(fn ($o) => [
            'code' => $o->code, 'table' => $o->type === 'takeout' ? 'Takeout '.($o->pickup_code ?? '') : $o->table_name,
            'at' => (int) CarbonImmutable::parse($o->created_at, 'UTC')->valueOf(), 'amount' => (float) ($amounts[$o->id] ?? 0),
        ]);

        return ['orders' => $list->count(), 'amount' => Money::r2($list->sum('amount')), 'list' => $list->take(10)->values()->all()];
    }

    /** day for up to a month, week for up to about half a year, month beyond that. */
    public static function autoGroup(int $days): string
    {
        return $days <= 31 ? 'day' : ($days <= 186 ? 'week' : 'month');
    }

    /**
     * Paid orders between two moments, with their amounts worked out.
     *
     * @return array{orders: Collection<int, array<string, mixed>>, items: Collection<int, object>, payments: Collection<int, object>}
     */
    private static function load(CarbonInterface $start, CarbonInterface $end): array
    {
        $tz = $start->getTimezone();
        $a = $start->clone()->utc()->format('Y-m-d H:i:s');
        $b = $end->clone()->utc()->format('Y-m-d H:i:s');

        $items = DB::table('app_order_items as oi')
            ->join('app_order_rounds as r', 'r.id', '=', 'oi.round_id')
            ->join('app_orders as o', 'o.id', '=', 'r.order_id')
            ->leftJoin('app_foods as f', 'f.id', '=', 'oi.food_id')
            ->leftJoin('app_categories as c', 'c.id', '=', 'f.category_id')
            ->whereNotNull('o.paid_at')->where('o.paid_at', '>=', $a)->where('o.paid_at', '<=', $b)
            ->get(['r.order_id', 'oi.name', 'oi.price', 'oi.qty', 'c.name as category']);
        $gross = $items->groupBy('order_id')->map(fn ($rows) => Money::r2($rows->sum(fn ($i) => (float) $i->price * (int) $i->qty)));

        $orders = DB::table('app_orders as o')
            ->leftJoin('app_dining_tables as t', 't.id', '=', 'o.table_id')
            ->leftJoin('app_floors as fl', 'fl.id', '=', 't.floor_id')
            ->leftJoin('app_table_sessions as s', 's.id', '=', 'o.session_id')
            ->whereNotNull('o.paid_at')->where('o.paid_at', '>=', $a)->where('o.paid_at', '<=', $b)
            ->get(['o.id', 'o.type', 'o.channel', 'o.discount_name', 'o.discount_pct', 'o.discount_total', 'o.paid_at', 't.name as table_name', 'fl.name as floor_name', 's.guests'])
            ->map(function ($o) use ($gross, $tz) {
                $g = (float) ($gross[$o->id] ?? 0);
                $net = $o->discount_total !== null ? Money::r2($g - (float) $o->discount_total) : Money::r2($g * (1 - (float) ($o->discount_pct ?? 0) / 100));
                $paid = CarbonImmutable::parse($o->paid_at, 'UTC')->setTimezone($tz);

                return [
                    'id' => $o->id, 'paid' => $paid, 'gross' => $g, 'net' => $net, 'discount' => Money::r2($g - $net),
                    'channel' => $o->type === 'takeout' ? ($o->channel ?: 'walkin') : 'dine_in', 'discountName' => $o->discount_name, 'discountPct' => (float) ($o->discount_pct ?? 0),
                    'table' => $o->table_name, 'floor' => $o->floor_name, 'guests' => (int) ($o->guests ?? 0),
                ];
            });

        $payments = DB::table('app_order_payments as p')
            ->join('app_orders as o', 'o.id', '=', 'p.order_id')
            ->whereNotNull('o.paid_at')->where('o.paid_at', '>=', $a)->where('o.paid_at', '<=', $b)
            ->get(['p.method', 'p.amount']);

        return ['orders' => $orders, 'items' => $items, 'payments' => $payments];
    }

    private static function totals(array $d): array
    {
        $orders = $d['orders'];
        $net = Money::r2($orders->sum('net'));
        $vatable = Money::r2($net / (1 + self::VAT_RATE));
        $n = $orders->count();

        return [
            'orders' => $n, 'gross' => Money::r2($orders->sum('gross')), 'discounts' => Money::r2($orders->sum('discount')), 'net' => $net,
            'vatable' => $vatable, 'vat' => Money::r2($net - $vatable), 'avgOrder' => $n ? Money::r2($net / $n) : 0.0,
            'guests' => (int) $orders->sum('guests'), 'itemsSold' => (int) $d['items']->sum('qty'),
        ];
    }

    /** One row for every day, week or month in the range (empty ones too), so a chart has no gaps. */
    private static function series(array $d, CarbonImmutable $from, CarbonImmutable $to, string $group): array
    {
        $key = fn (CarbonImmutable $t) => match ($group) {
            'week' => $t->startOfWeek()->toDateString(), 'month' => $t->startOfMonth()->format('Y-m'), default => $t->toDateString(),
        };
        $rows = [];
        for ($t = $from->startOfDay(); $t->lessThanOrEqualTo($to); $t = $t->addDay()) {
            $k = $key($t);
            $rows[$k] ??= ['key' => $k, 'from' => $t->toDateString(), 'to' => $t->toDateString(), 'orders' => 0, 'gross' => 0.0, 'discounts' => 0.0, 'net' => 0.0];
            $rows[$k]['to'] = $t->toDateString();
        }
        foreach ($d['orders'] as $o) {
            $r = &$rows[$key($o['paid'])];
            $r['orders']++;
            $r['gross'] = Money::r2($r['gross'] + $o['gross']);
            $r['discounts'] = Money::r2($r['discounts'] + $o['discount']);
            $r['net'] = Money::r2($r['net'] + $o['net']);
            unset($r);
        }

        return array_values($rows);
    }

    private static function byHour(array $d): array
    {
        $rows = array_map(fn ($h) => ['hour' => $h, 'orders' => 0, 'net' => 0.0], range(0, 23));
        foreach ($d['orders'] as $o) {
            $h = (int) $o['paid']->format('G');
            $rows[$h]['orders']++;
            $rows[$h]['net'] = Money::r2($rows[$h]['net'] + $o['net']);
        }

        return $rows;
    }

    private static function byPayment(array $d): array
    {
        $names = PaymentMethod::query()->pluck('name', 'id');

        return $d['payments']->groupBy('method')->map(fn ($rows, $method) => [
            'method' => (string) $method, 'name' => $names[(int) $method] ?? "Method {$method}", 'count' => $rows->count(), 'amount' => Money::r2($rows->sum(fn ($p) => (float) $p->amount)),
        ])->sortByDesc('amount')->values()->all();
    }

    private static function byChannel(array $d): array
    {
        return $d['orders']->groupBy('channel')->map(fn ($rows, $channel) => [
            'channel' => $channel, 'name' => self::CHANNELS[$channel] ?? ucfirst($channel), 'orders' => $rows->count(), 'net' => Money::r2($rows->sum('net')),
        ])->sortByDesc('net')->values()->all();
    }

    /** Sales before order discounts, since a discount belongs to the whole bill. */
    private static function byCategory(array $d): array
    {
        return $d['items']->groupBy(fn ($i) => $i->category ?? 'Other')->map(fn ($rows, $cat) => [
            'category' => $cat, 'qty' => (int) $rows->sum('qty'), 'sales' => Money::r2($rows->sum(fn ($i) => (float) $i->price * (int) $i->qty)),
        ])->sortByDesc('sales')->values()->all();
    }

    private static function items(array $d): array
    {
        return $d['items']->groupBy('name')->map(fn ($rows, $name) => [
            'name' => $name, 'category' => $rows->first()->category ?? 'Other', 'qty' => (int) $rows->sum('qty'),
            'sales' => Money::r2($rows->sum(fn ($i) => (float) $i->price * (int) $i->qty)),
        ])->sortByDesc('qty')->values()->all();
    }

    private static function byTable(array $d): array
    {
        return $d['orders']->where('channel', 'dine_in')->whereNotNull('table')->groupBy('table')->map(fn ($rows, $table) => [
            'table' => $table, 'floor' => $rows->first()['floor'], 'orders' => $rows->count(), 'guests' => (int) $rows->sum('guests'), 'net' => Money::r2($rows->sum('net')),
        ])->sortByDesc('net')->values()->all();
    }

    private static function discounts(array $d): array
    {
        return $d['orders']->filter(fn ($o) => $o['discountName'] !== null && $o['discount'] > 0)->groupBy('discountName')->map(fn ($rows, $name) => [
            'name' => $name, 'pct' => $rows->first()['discountPct'], 'orders' => $rows->count(), 'amount' => Money::r2($rows->sum('discount')),
        ])->sortByDesc('amount')->values()->all();
    }
}
