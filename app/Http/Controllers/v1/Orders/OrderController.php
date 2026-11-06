<?php

namespace App\Http\Controllers\v1\Orders;

use App\Exceptions\ApiException;
use App\Http\Controllers\v1\BaseController;
use App\Http\Controllers\v1\Tables\TableController;
use App\Http\Resources\OrderRoundResource;
use App\Http\Resources\TableResource;
use App\Models\OrderRound;
use App\Support\OrderService;
use App\Support\Settlement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends BaseController
{
    /** Every round of every order, shaped like the UI's order list (one row per send to the kitchen). */
    public function index(Request $request): JsonResponse
    {
        $from = match ($request->query('range')) {
            'today' => now()->startOfDay(), 'week' => now()->subDays(6)->startOfDay(), 'month' => now()->subDays(29)->startOfDay(), default => null,
        };
        $q = trim((string) $request->query('q', ''));
        $rounds = OrderRound::query()->with(['order.rounds.items', 'order.payments', 'order.session', 'items'])
            ->when($from, fn ($qb) => $qb->where('created_at', '>=', $from))
            ->when($q !== '', fn ($qb) => $qb->where(fn ($w) => $w->where('code', 'like', "%{$q}%")->orWhere('created_by', 'like', "%{$q}%")
                ->orWhereHas('order', fn ($o) => $o->where('code', 'like', "%{$q}%")->orWhere('pickup_code', 'like', "%{$q}%")->orWhere('customer', 'like', "%{$q}%"))))
            ->orderBy('created_at')->orderBy('id')->get();

        return $this->sendResponse($rounds->map(fn ($r) => (new OrderRoundResource($r))->resolve())->all());
    }

    /** Pays the whole bill the given round belongs to (every round of its order). Frees the table for cleaning. */
    public function pay(Request $request, string $code): JsonResponse
    {
        $request->validate(TableController::payRules());
        $round = OrderService::findRound($code);
        $order = Settlement::pay($round->order, $request->input('discountId') ? (int) $request->input('discountId') : null, $request->input('pays'));

        $table = $order->table_id ? $order->table : null;
        if ($table && $table->openSession?->id === $order->session_id && in_array($table->status, ['active', 'ordering', 'eating', 'billout'], true)) {
            $table->update(['status' => 'cleaning']);
            $table->openSession->update(['bill_method' => null, 'bill_requested_at' => null]);
        }

        return $this->sendResponse([
            'count' => $order->rounds->count(), 'payment' => $order->payment_method ?? '',
            'table' => $table ? (new TableResource($table->fresh('openSession')))->resolve() : null,
        ], 'Paid');
    }

    /** Pay on pickup: one takeout order, paid and handed over at the counter. */
    public function pickup(Request $request, string $code): JsonResponse
    {
        $request->validate(TableController::payRules());
        $round = OrderService::findRound($code);
        Settlement::pay($round->order, $request->input('discountId') ? (int) $request->input('discountId') : null, $request->input('pays'));

        return $this->sendResponse((new OrderRoundResource(OrderService::findRound($code)))->resolve(), 'Paid');
    }

    /** GrabFood and Foodpanda orders are paid in the app; the counter only hands them to the rider. */
    public function handover(string $code): JsonResponse
    {
        $round = OrderService::findRound($code);
        $o = $round->order;
        if (! in_array($o->channel, ['grab', 'panda'], true)) {
            throw new ApiException('Only delivery platform orders are handed over.');
        }
        Settlement::pay($o, null, [['method' => $o->channel, 'amount' => Settlement::subtotal($o)]]);

        return $this->sendResponse((new OrderRoundResource(OrderService::findRound($code)))->resolve(), 'Handed over');
    }

    /** Counter takeout entry (also used for GrabFood / Foodpanda orders). */
    public function takeout(Request $request): JsonResponse
    {
        $v = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.foodId' => ['required', 'exists:app_foods,id'],
            'items.*.variantId' => ['nullable'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.note' => ['nullable', 'string', 'max:120'],
            'customer' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'channel' => ['required', Rule::in(['walkin', 'grab', 'panda'])],
            'ref' => ['nullable', 'string', 'max:255'],
        ], ['customer.required' => 'Enter the customer name first']);

        $round = OrderService::placeTakeout(
            array_map(fn ($i) => ['food_id' => $i['foodId'], 'variant_id' => $i['variantId'] ?? null, 'qty' => $i['qty'], 'note' => $i['note'] ?? null], $v['items']),
            trim($v['customer']), trim($v['phone'] ?? ''), 'counter', $v['channel'], trim($v['ref'] ?? ''),
        );

        return $this->sendResponse((new OrderRoundResource(OrderService::findRound($round->code)))->resolve(), 'Order placed', 201);
    }
}
