<?php

namespace App\Http\Controllers\v1\Kitchen;

use App\Exceptions\ApiException;
use App\Http\Controllers\v1\BaseController;
use App\Http\Resources\OrderRoundResource;
use App\Models\OrderRound;
use App\Support\OrderService;
use App\Support\TableSync;
use Illuminate\Http\JsonResponse;

/** The kitchen works on rounds: queued, cooking, plating, order out, then served (dine-in) or ready (takeout). */
class KitchenController extends BaseController
{
    /** GET /api/kitchen/queue: the orders still in the kitchen. */
    public function queue(): JsonResponse
    {
        $rounds = OrderRound::query()->with(['order.rounds.items', 'order.payments', 'order.session', 'items'])
            ->whereIn('status', OrderRound::KITCHEN)->whereHas('order', fn ($o) => $o->whereNull('paid_at'))->orderBy('created_at')->orderBy('id')->get();

        return $this->sendResponse($rounds->map(fn ($r) => (new OrderRoundResource($r))->resolve())->all());
    }

    /** Queued, then cooking, then plating, then order out. */
    public function advance(string $code): JsonResponse
    {
        $round = OrderService::findRound($code);
        $next = ['queued' => 'cooking', 'cooking' => 'plating', 'plating' => 'completed'][$round->status] ?? throw new ApiException('This order is already out');
        $round->update(['status' => $next]);

        return $this->done($code);
    }

    /** Takeout leaves the kitchen for the counter. Payment and pickup are marked in Orders. */
    public function ready(string $code): JsonResponse
    {
        $round = OrderService::findRound($code);
        if (! $round->order->isTakeout()) {
            throw new ApiException('Only takeout orders go to the counter.');
        }
        if ($round->status !== 'completed') {
            throw new ApiException('The kitchen has not sent this order out yet.');
        }
        $round->update(['status' => 'ready', 'ready_at' => now()]);

        return $this->done($code);
    }

    /** Dine-in order out becomes served, and the table follows its orders. */
    public function serve(string $code): JsonResponse
    {
        $round = OrderService::findRound($code);
        if ($round->order->isTakeout()) {
            throw new ApiException('Takeout orders are handed over at the counter.');
        }
        if ($round->status !== 'completed') {
            throw new ApiException('The kitchen has not sent this order out yet.');
        }
        $round->update(['status' => 'served', 'served_at' => now()]);
        if ($t = $round->order->table) {
            TableSync::sync($t);
        }

        return $this->done($code);
    }

    private function done(string $code): JsonResponse
    {
        return $this->sendResponse((new OrderRoundResource(OrderService::findRound($code)))->resolve());
    }
}
