<?php

namespace App\Http\Controllers\v1\Tables;

use App\Exceptions\ApiException;
use App\Http\Controllers\v1\BaseController;
use App\Http\Resources\TableResource;
use App\Models\DiningTable;
use App\Models\Order;
use App\Support\Money;
use App\Support\Settlement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TableController extends BaseController
{
    protected string $model = DiningTable::class;

    protected ?string $resource = TableResource::class;

    protected array $with = ['openSession'];

    protected array $searchable = ['name'];

    protected array $filterable = ['status', 'floor_id'];

    protected array $exactFilters = ['status', 'floor_id'];

    protected array $sortable = ['id', 'name', 'seats', 'status'];

    protected string $sortBy = 'id';

    protected bool $requireInactiveBeforeDelete = false;

    protected function storeRules(): array
    {
        return ['name' => ['required', 'string', 'max:255'], 'seats' => ['required', 'integer', 'min:1', 'max:40'], 'floor' => ['required', 'exists:app_floors,id']];
    }

    protected function updateRules(Model $model): array
    {
        return ['name' => ['sometimes', 'required', 'string', 'max:255'], 'seats' => ['sometimes', 'required', 'integer', 'min:1', 'max:40'], 'floor' => ['sometimes', 'required', 'exists:app_floors,id']];
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        $data = array_filter(['name' => isset($validated['name']) ? trim($validated['name']) : null, 'seats' => $validated['seats'] ?? null, 'floor_id' => $validated['floor'] ?? null], fn ($v) => $v !== null);
        $floor = $data['floor_id'] ?? $model?->floor_id;
        $name = $data['name'] ?? $model?->name;
        $dup = DiningTable::query()->where('floor_id', $floor)->where('name', $name)->when($model, fn ($q) => $q->whereKeyNot($model->id))->exists();
        if ($dup) {
            throw new ApiException('That floor already has a table with this name.');
        }

        return $model === null ? $data + ['x' => 50, 'y' => 50, 'status' => 'inactive'] : $data;
    }

    protected function beforeDelete(Model $model): void
    {
        if ($model->status !== 'inactive') {
            throw new ApiException("{$model->name} has guests right now. Collect payment and mark it clean first.");
        }
    }

    /** Guests sit down: a new QR session with a fresh token and an empty plate. */
    public function activate(Request $request, int $id): JsonResponse
    {
        $guests = $request->validate(['guests' => ['required', 'integer', 'min:1', 'max:60']])['guests'];
        $table = DB::transaction(function () use ($id, $guests) {
            $t = DiningTable::query()->lockForUpdate()->findOrFail($id);
            if ($t->status !== 'inactive') {
                throw new ApiException("{$t->name} is not free.");
            }
            $t->sessions()->create(['token' => Str::lower(Str::random(10)), 'guests' => $guests, 'opened_at' => now()]);
            $t->update(['status' => 'active']);

            return $t;
        });

        return $this->sendResponse($this->present($this->fresh($table)), 'Table activated');
    }

    /** Back to inactive. The session closes, so the old QR token stops working. */
    public function clean(int $id): JsonResponse
    {
        $table = DB::transaction(function () use ($id) {
            $t = DiningTable::query()->lockForUpdate()->findOrFail($id);
            $s = $t->openSession;
            if ($s) {
                $s->plateLines()->delete();
                $s->update(['closed_at' => now(), 'bill_method' => null, 'bill_requested_at' => null]);
            }
            $t->update(['status' => 'inactive']);

            return $t;
        });

        return $this->sendResponse($this->present($this->fresh($table)), 'Table is free');
    }

    /** Layout editing: position in percent, clamped to the floor. */
    public function position(Request $request, int $id): JsonResponse
    {
        $v = $request->validate(['x' => ['required', 'numeric'], 'y' => ['required', 'numeric']]);
        $table = DiningTable::query()->findOrFail($id);
        $table->update(['x' => Money::r2(max(3, min(97, $v['x']))), 'y' => Money::r2(max(5, min(95, $v['y'])))]);

        return $this->sendResponse($this->present($this->fresh($table)));
    }

    /** Receives payment for the open session's order. The table then waits to be cleaned. */
    public function pay(Request $request, int $id): JsonResponse
    {
        $table = DiningTable::query()->findOrFail($id);
        $order = Order::query()->where('session_id', $table->openSession?->id)->first() ?? throw new ApiException('There is nothing to pay on this table.');
        Settlement::pay($order, $this->discountId($request), $this->pays($request));
        $table->update(['status' => 'cleaning']);
        $table->openSession?->update(['bill_method' => null, 'bill_requested_at' => null]);

        return $this->sendResponse(['table' => $this->present($this->fresh($table))], 'Paid');
    }

    public static function payRules(): array
    {
        return [
            'discountId' => ['nullable', 'exists:app_discounts,id'],
            'pays' => ['required', 'array', 'min:1'],
            'pays.*.method' => ['required', 'string', 'max:40'],
            'pays.*.amount' => ['required', 'numeric', 'gt:0'],
            'pays.*.received' => ['nullable', 'numeric', 'gt:0'],
            'pays.*.ref' => ['nullable', 'string', 'max:40'],
        ];
    }

    private function discountId(Request $r): ?int
    {
        $r->validate(self::payRules());

        return $r->input('discountId') ? (int) $r->input('discountId') : null;
    }

    private function pays(Request $r): array
    {
        return $r->input('pays');
    }
}
