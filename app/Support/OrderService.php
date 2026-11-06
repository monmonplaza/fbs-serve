<?php

namespace App\Support;

use App\Exceptions\ApiException;
use App\Models\Food;
use App\Models\Order;
use App\Models\OrderRound;
use App\Models\PlateLine;
use App\Models\TableSession;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Creating orders. A table session has ONE order; every send to the kitchen adds a round to it. */
final class OrderService
{
    /**
     * Turns plate lines (one per guest) or staff-entered lines into order items: one per food, variant and note.
     * Names and prices come from the menu, never from the client.
     *
     * @param  iterable<array{food_id: int|string, variant_id?: int|string|null, qty: int, note?: ?string}>  $lines
     * @return array{items: array<int, array<string, mixed>>, eta: int}
     */
    public static function buildItems(iterable $lines): array
    {
        $lines = collect($lines);
        $foods = Food::query()->with('variants')->whereIn('id', $lines->pluck('food_id')->unique())->get()->keyBy('id');
        $items = [];
        foreach ($lines as $l) {
            $f = $foods->get((int) $l['food_id']);
            if (! $f) {
                throw new ApiException('This dish is no longer on the menu');
            }
            if ($f->status !== 'available') {
                throw new ApiException("{$f->name} is not available");
            }
            $vid = isset($l['variant_id']) && $l['variant_id'] !== '' ? (int) $l['variant_id'] : null;
            if ($f->variants->isNotEmpty() && ! $f->variants->contains('id', $vid)) {
                $vid = $f->variants->first()->id;
            }
            if ($f->variants->isEmpty()) {
                $vid = null;
            }
            $note = isset($l['note']) ? mb_substr(trim((string) $l['note']), 0, 120) : null;
            $note = $note === '' ? null : $note;
            $key = $f->id.'|'.$vid.'|'.$note; // lines with different notes stay separate so the kitchen sees each request
            if (isset($items[$key])) {
                $items[$key]['qty'] += (int) $l['qty'];

                continue;
            }
            $items[$key] = [
                'food_id' => $f->id, 'variant_id' => $vid, 'name' => $f->itemName($vid), 'price' => $f->unitPrice($vid),
                'qty' => max(1, (int) $l['qty']), 'note' => $note, 'eta' => (int) $f->eta_minutes,
            ];
        }
        if (! $items) {
            throw new ApiException('Your plate is empty');
        }

        return ['items' => array_values($items), 'eta' => max(1, ...array_column($items, 'eta'))];
    }

    /** Sends the session's shared plate to the kitchen as the next round of the session's order. */
    public static function sendPlate(TableSession $session, string $by): OrderRound
    {
        return DB::transaction(function () use ($session, $by) {
            // Serialises two guests sending at the same moment: one creates the order, the other adds a round.
            $session = TableSession::query()->lockForUpdate()->findOrFail($session->id);
            $table = $session->table;
            if ($session->closed_at || ! in_array($table->status, ['active', 'ordering', 'eating'], true)) {
                throw new ApiException($table->status === 'billout' ? 'The bill was already requested for this table.' : 'This table is not active');
            }
            $lines = $session->plateLines()->get();
            if ($lines->isEmpty()) {
                throw new ApiException('Your plate is empty');
            }
            ['items' => $items, 'eta' => $eta] = self::buildItems($lines->map(fn (PlateLine $l) => [
                'food_id' => $l->food_id, 'variant_id' => $l->variant_id, 'qty' => $l->qty, 'note' => $l->note,
            ]));

            $order = $session->order ?? self::newOrder(['session_id' => $session->id, 'table_id' => $table->id, 'type' => 'dine_in', 'created_by' => $by]);
            $round = self::addRound($order, $items, $eta, $by);
            $session->plateLines()->delete();
            TableSync::sync($table);

            return $round;
        });
    }

    /**
     * Takeout (counter entry, Takeout QR or a delivery platform): its own order with a single round and a pickup number per day.
     *
     * @param  iterable<array<string, mixed>>  $lines
     */
    public static function placeTakeout(iterable $lines, string $customer, string $phone, string $source, string $channel = 'walkin', string $ref = ''): OrderRound
    {
        return DB::transaction(function () use ($lines, $customer, $phone, $source, $channel, $ref) {
            ['items' => $items, 'eta' => $eta] = self::buildItems($lines);
            $today = now()->startOfDay();
            $n = Order::query()->where('type', 'takeout')->where('created_at', '>=', $today)->lockForUpdate()->count() + 1;
            $order = self::newOrder([
                'type' => 'takeout', 'created_by' => $customer, 'customer' => $customer, 'phone' => $phone, 'source' => $source, 'channel' => $channel,
                'channel_ref' => $ref ?: null, 'pickup_code' => 'TO-'.str_pad((string) $n, 3, '0', STR_PAD_LEFT),
            ]);

            return self::addRound($order, $items, $eta, $customer);
        });
    }

    private static function newOrder(array $attrs): Order
    {
        $order = Order::query()->create($attrs + ['code' => 'pending-'.bin2hex(random_bytes(6))]);
        $order->update(['code' => 'ORD-'.(1000 + $order->id)]);

        return $order;
    }

    private static function addRound(Order $order, array $items, int $eta, string $by): OrderRound
    {
        $no = $order->rounds()->count() + 1;
        $round = $order->rounds()->create([
            'round_no' => $no, 'code' => $no === 1 ? $order->code : "{$order->code}-{$no}", 'status' => 'queued', 'created_by' => $by, 'eta_minutes' => $eta,
        ]);
        foreach ($items as $i) {
            $round->items()->create(collect($i)->except('eta')->all());
        }

        return $round->load('items');
    }

    /** A round with everything its Resource needs, found by the code the UI uses as the order id. */
    public static function findRound(string $code): OrderRound
    {
        return OrderRound::query()->with(['order.rounds.items', 'order.payments', 'order.session', 'items'])->where('code', $code)->first()
            ?? throw new ApiException('Order not found', 404);
    }

    /** @return Collection<int, OrderRound> */
    public static function rounds(): Collection
    {
        return OrderRound::query()->with(['order.rounds.items', 'order.payments', 'order.session', 'items'])->get();
    }
}
