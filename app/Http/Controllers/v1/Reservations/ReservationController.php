<?php

namespace App\Http\Controllers\v1\Reservations;

use App\Exceptions\ApiException;
use App\Http\Controllers\v1\BaseController;
use App\Http\Resources\ReservationResource;
use App\Http\Resources\TableResource;
use App\Models\DiningTable;
use App\Models\Reservation;
use App\Models\TableSession;
use App\Support\OrderService;
use App\Support\TableSync;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Bookings: the standard CRUD (create, edit, list) plus the actions the Reservations screen has (move, cancel, no-show, restore, dismiss, seat). */
class ReservationController extends BaseController
{
    protected string $model = Reservation::class;

    protected ?string $resource = ReservationResource::class;

    protected array $with = ['items', 'history'];

    protected array $searchable = ['name', 'phone'];

    protected array $sortable = ['id', 'starts_at'];

    protected string $sortBy = 'starts_at';

    protected function storeRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'pax' => ['required', 'integer', 'min:1', 'max:60'],
            'at' => ['required', 'numeric'],
            'tableId' => ['nullable', 'exists:app_dining_tables,id'],
            'note' => ['nullable', 'string', 'max:500'],
            'order' => ['nullable', 'array'],
            'order.*.foodId' => ['required', 'exists:app_foods,id'],
            'order.*.variantId' => ['nullable'],
            'order.*.qty' => ['required', 'integer', 'min:1', 'max:99'],
        ];
    }

    protected function validationMessages(): array
    {
        return ['name.required' => 'Fill in the name, guests, date and time', 'pax.required' => 'Fill in the name, guests, date and time', 'at.required' => 'Fill in the name, guests, date and time'];
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        $at = Carbon::createFromTimestampMs((int) $validated['at']);
        $tableId = isset($validated['tableId']) ? (int) $validated['tableId'] : null;
        if ($problem = $this->problem($tableId, (int) $validated['pax'], $at, $model?->id)) {
            throw new ApiException($problem);
        }
        $data = [
            'name' => trim($validated['name']), 'phone' => trim($validated['phone'] ?? ''), 'pax' => $validated['pax'],
            'starts_at' => $at, 'table_id' => $tableId, 'note' => trim($validated['note'] ?? ''),
        ];
        if ($model !== null && $model->starts_at->valueOf() !== $at->valueOf()) {
            $data['dismissed'] = false;
        }

        return $data;
    }

    protected function afterCreate(Model $model, array $validated, Request $request): void
    {
        $this->syncItems($model, $validated['order'] ?? null);
        $model->log('Booked');
    }

    protected function afterUpdate(Model $model, array $validated, Request $request): void
    {
        $this->syncItems($model, $validated['order'] ?? null);
        $model->log('Edited');
    }

    /** Reschedule to another date, time or table. */
    public function move(Request $request, int $id): JsonResponse
    {
        $v = $request->validate(['at' => ['required', 'numeric'], 'tableId' => ['nullable', 'exists:app_dining_tables,id'], 'reason' => ['nullable', 'string', 'max:255']], ['at.required' => 'Pick a date and time']);
        $r = Reservation::query()->findOrFail($id);
        $at = Carbon::createFromTimestampMs((int) $v['at']);
        $tableId = isset($v['tableId']) ? (int) $v['tableId'] : null;
        if ($at->valueOf() === $r->starts_at->valueOf() && $tableId === $r->table_id) {
            throw new ApiException('Pick a different date, time or table');
        }
        if ($problem = $this->problem($tableId, $r->pax, $at, $r->id)) {
            throw new ApiException($problem);
        }
        $reason = trim($v['reason'] ?? '');
        $r->log('Rescheduled from '.$this->when($r->starts_at).($reason !== '' ? ": {$reason}" : ''));
        $r->update(['starts_at' => $at, 'table_id' => $tableId, 'dismissed' => false]);

        return $this->sendResponse($this->present($this->fresh($r)), 'Rescheduled');
    }

    /** Dragging a booked reservation to another calendar day keeps its time. `day` is the start of that day. */
    public function moveToDay(Request $request, int $id): JsonResponse
    {
        $day = Carbon::createFromTimestampMs((int) $request->validate(['day' => ['required', 'numeric']])['day'])->timezone(config('app.timezone'));
        $r = Reservation::query()->findOrFail($id);
        if ($r->status !== 'booked') {
            throw new ApiException('Only booked reservations can be moved');
        }
        if ($day->isSameDay($r->starts_at)) {
            return $this->sendResponse($this->present($this->fresh($r)));
        }
        $at = $day->copy()->setTime($r->starts_at->hour, $r->starts_at->minute);
        if ($problem = $this->problem($r->table_id, $r->pax, $at, $r->id)) {
            throw new ApiException($problem);
        }
        $r->log('Rescheduled from '.$this->when($r->starts_at).' (dragged on the calendar)');
        $r->update(['starts_at' => $at, 'dismissed' => false]);

        return $this->sendResponse($this->present($this->fresh($r)), 'Rescheduled');
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $reason = trim($request->validate(['reason' => ['nullable', 'string', 'max:255']])['reason'] ?? '');
        $r = Reservation::query()->findOrFail($id);
        $r->update(['status' => 'cancelled', 'cancel_reason' => $reason, 'dismissed' => true]);
        $r->log('Cancelled'.($reason !== '' ? ": {$reason}" : ''));

        return $this->sendResponse($this->present($this->fresh($r)), 'Cancelled');
    }

    public function noShow(int $id): JsonResponse
    {
        $r = Reservation::query()->findOrFail($id);
        $r->update(['status' => 'noshow', 'dismissed' => true]);
        $r->log('Marked as no-show');

        return $this->sendResponse($this->present($this->fresh($r)), 'Marked as no-show');
    }

    public function restore(int $id): JsonResponse
    {
        $r = Reservation::query()->findOrFail($id);
        $r->update(['status' => 'booked', 'dismissed' => false]);
        $r->log('Restored');

        return $this->sendResponse($this->present($this->fresh($r)), 'Restored');
    }

    /** Hides the reminder on the shell; the booking itself stays. */
    public function dismiss(int $id): JsonResponse
    {
        Reservation::query()->findOrFail($id)->update(['dismissed' => true]);

        return $this->sendResponse(null);
    }

    /** Seats a booked reservation: activates the table and puts the advance order on its plate. */
    public function seat(Request $request, int $id): JsonResponse
    {
        $tableId = (int) $request->validate(['tableId' => ['required', 'exists:app_dining_tables,id']])['tableId'];
        [$r, $table] = DB::transaction(function () use ($id, $tableId) {
            $r = Reservation::query()->with('items')->lockForUpdate()->findOrFail($id);
            if ($r->status !== 'booked') {
                throw new ApiException('Only booked reservations can be seated');
            }
            $t = DiningTable::query()->lockForUpdate()->findOrFail($tableId);
            if ($t->status !== 'inactive') {
                throw new ApiException('That table is in use');
            }
            $session = $t->sessions()->create(TableSession::startAttributes($r->pax));
            $t->update(['status' => 'active']);
            foreach ($r->items as $i) {
                $session->plateLines()->create(['food_id' => $i->food_id, 'variant_id' => $i->variant_id, 'qty' => $i->qty, 'added_by' => $r->name]);
            }
            TableSync::sync($t);
            $r->update(['status' => 'arrived', 'table_id' => $t->id]);
            $r->log("Seated at {$t->name}");

            return [$r, $t];
        });

        return $this->sendResponse([
            'reservation' => $this->present($this->fresh($r)),
            'table' => (new TableResource($table->load('openSession')))->resolve(),
        ], 'Seated');
    }

    /** Replaces the advance order. Names and prices come from the menu, never from the client. */
    private function syncItems(Model $r, ?array $order): void
    {
        $r->items()->delete();
        if (! $order) {
            return;
        }
        $built = OrderService::buildItems(array_map(fn ($l) => ['food_id' => $l['foodId'], 'variant_id' => $l['variantId'] ?? null, 'qty' => $l['qty']], $order));
        foreach ($built['items'] as $i) {
            $r->items()->create(['food_id' => $i['food_id'], 'variant_id' => $i['variant_id'], 'name' => $i['name'], 'price' => $i['price'], 'qty' => $i['qty']]);
        }
    }

    /** Not enough seats, or another live booking on the same table within the hold time. Empty when fine. */
    private function problem(?int $tableId, int $pax, Carbon $at, ?int $ignoreId): string
    {
        $t = $tableId ? DiningTable::query()->find($tableId) : null;
        if (! $t) {
            return '';
        }
        if ($t->seats < $pax) {
            return "{$t->name} seats only {$t->seats}.";
        }
        $hold = Reservation::HOLD_MINUTES;
        $c = Reservation::query()->where('table_id', $t->id)->whereIn('status', Reservation::LIVE)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->where('starts_at', '>', $at->copy()->subMinutes($hold))->where('starts_at', '<', $at->copy()->addMinutes($hold))->first();

        return $c ? "{$t->name} is already reserved by {$c->name} at ".$c->starts_at->timezone(config('app.timezone'))->format('g:i A').'.' : '';
    }

    private function when(Carbon $t): string
    {
        return $t->copy()->timezone(config('app.timezone'))->format('D, M j, g:i A');
    }
}
