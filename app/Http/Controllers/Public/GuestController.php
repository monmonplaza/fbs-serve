<?php

namespace App\Http\Controllers\Public;

use App\Exceptions\ApiException;
use App\Http\Controllers\v1\BaseController;
use App\Http\Resources\OrderRoundResource;
use App\Http\Resources\PlateLineResource;
use App\Models\Food;
use App\Models\PaymentMethod;
use App\Models\PlateLine;
use App\Models\TableSession;
use App\Support\OrderService;
use App\Support\Settlement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * What the guest phone calls. Authorised by the QR token (`k`) of the table's open session, never by a login: a closed or replaced
 * session is rejected. The Takeout QR uses the pseudo table `__takeout` and one shared plate (a per-device token is a later step).
 */
class GuestController extends BaseController
{
    public const TAKEOUT = '__takeout';

    private const INVALID = 'This QR code is no longer valid. Ask your waiter for a new one.';

    /** GET /api/public/tables/{table}/session: checks the QR token; the phone joins that table session. */
    public function join(Request $request, string $table): JsonResponse
    {
        $this->scope($request, $table);

        return $this->sendResponse(null);
    }

    /** GET /api/public/tables/{table}/plate: the shared plate of this table session. */
    public function plate(Request $request, string $table): JsonResponse
    {
        return $this->sendResponse($this->lines($request, $table)->get()->map(fn ($l) => (new PlateLineResource($l))->resolve())->all());
    }

    /** Adds one of a food to the shared plate; the same guest adding the same dish again raises its quantity. */
    public function addLine(Request $request, string $table): JsonResponse
    {
        $v = $request->validate(['foodId' => ['required'], 'variantId' => ['nullable'], 'by' => ['required', 'string', 'max:60']]);
        $food = Food::query()->with('variants')->find((int) $v['foodId']);
        if (! $food) {
            throw new ApiException('This dish is no longer on the menu');
        }
        if ($food->status !== 'available') {
            throw new ApiException("{$food->name} is not available");
        }
        $vid = $food->variants->isEmpty() ? null : ($food->variants->firstWhere('id', (int) ($v['variantId'] ?? 0))?->id ?? $food->variants->first()->id);

        DB::transaction(function () use ($request, $table, $food, $vid, $v) {
            $line = $this->lines($request, $table)->where('food_id', $food->id)->where('variant_id', $vid)->where('added_by', $v['by'])->lockForUpdate()->first();
            $line ? $line->increment('qty') : PlateLine::query()->create($this->owner($request, $table) + ['food_id' => $food->id, 'variant_id' => $vid, 'qty' => 1, 'added_by' => $v['by']]);
        });

        return $this->sendResponse(['name' => $food->itemName($vid)]);
    }

    /** `delta` changes the quantity by +1/-1 (below 1 removes the line); `note` sets or clears the cooking request (max 120 characters). */
    public function updateLine(Request $request, string $table, int $line): JsonResponse
    {
        $v = $request->validate(['delta' => ['sometimes', 'integer', 'between:-50,50'], 'note' => ['sometimes', 'nullable', 'string']]);
        $l = $this->lines($request, $table)->whereKey($line)->first();
        if (! $l) {
            return $this->sendResponse(null);
        }
        if (array_key_exists('delta', $v)) {
            $l->qty += $v['delta'];
            $l->qty < 1 ? $l->delete() : $l->save();
        }
        if (array_key_exists('note', $v) && $l->exists) {
            $n = mb_substr(trim((string) $v['note']), 0, 120);
            $l->update(['note' => $n === '' ? null : $n]);
        }

        return $this->sendResponse(null);
    }

    /** Sends the table's shared plate to the kitchen as the next round of the session's single order. */
    public function send(Request $request, string $table): JsonResponse
    {
        $by = $request->validate(['by' => ['required', 'string', 'max:60']])['by'];
        $session = $this->scope($request, $table);
        if (! $session) {
            throw new ApiException('Use the Takeout form to place a takeout order.');
        }
        $round = OrderService::sendPlate($session, $by);

        return $this->sendResponse((new OrderRoundResource(OrderService::findRound($round->code)))->resolve(), 'Sent to the kitchen', 201);
    }

    /** The guest asks for the bill and picks how to pay. */
    public function billOut(Request $request, string $table): JsonResponse
    {
        $method = $request->validate(['method' => ['required', 'string', 'max:40']])['method'];
        if (! PaymentMethod::query()->where('active', true)->whereKey($method)->exists()) {
            throw new ApiException('Choose a payment method.');
        }
        $session = $this->scope($request, $table) ?? throw new ApiException('Takeout orders are paid at the counter.');
        $order = $session->order()->with('rounds.items')->first() ?? throw new ApiException('There is nothing to pay yet.');
        $t = $session->table;
        if (! in_array($t->status, ['active', 'ordering', 'eating', 'billout'], true)) {
            throw new ApiException('This table is not active');
        }
        $session->update(['bill_method' => $method, 'bill_requested_at' => now()]);
        $t->update(['status' => 'billout']);

        return $this->sendResponse(['name' => $t->name, 'total' => Settlement::subtotal($order)]);
    }

    /** Places the Takeout-QR plate as a takeout order. */
    public function placeTakeout(Request $request): JsonResponse
    {
        $v = $request->validate(['name' => ['required', 'string', 'max:255'], 'phone' => ['nullable', 'string', 'max:40']], ['name.required' => 'Enter your name first']);
        $plate = PlateLine::query()->where('takeout_token', self::TAKEOUT)->get();
        if ($plate->isEmpty()) {
            throw new ApiException('Your plate is empty');
        }
        $round = DB::transaction(function () use ($plate, $v) {
            $r = OrderService::placeTakeout(
                $plate->map(fn ($l) => ['food_id' => $l->food_id, 'variant_id' => $l->variant_id, 'qty' => $l->qty, 'note' => $l->note]),
                trim($v['name']), trim($v['phone'] ?? ''), 'qr',
            );
            PlateLine::query()->where('takeout_token', self::TAKEOUT)->delete();

            return $r;
        });

        return $this->sendResponse((new OrderRoundResource(OrderService::findRound($round->code)))->resolve(), 'Order placed', 201);
    }

    /** The open session this phone may act on, or null for the Takeout QR. Throws for a stale or foreign token. */
    private function scope(Request $request, string $table): ?TableSession
    {
        if ($table === self::TAKEOUT) {
            return null;
        }
        $token = (string) ($request->query('k') ?? $request->input('k', ''));
        $s = $token === '' || ! ctype_digit($table) ? null : TableSession::query()->with('table')->where('token', $token)->where('table_id', (int) $table)->whereNull('closed_at')->first();

        return $s ?? throw new ApiException(self::INVALID, 403);
    }

    /** Who owns the plate: the table session, or the shared Takeout plate. */
    private function owner(Request $request, string $table): array
    {
        $s = $this->scope($request, $table);

        return $s ? ['session_id' => $s->id] : ['takeout_token' => self::TAKEOUT];
    }

    private function lines(Request $request, string $table)
    {
        return PlateLine::query()->where($this->owner($request, $table));
    }
}
