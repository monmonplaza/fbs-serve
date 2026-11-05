<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * CRUD backbone (docs/reusable-components-in-all-projects.md, section 6). A child controller is configured with properties and
 * overrides only what differs. Unlike the sms original, store/update return the Resource, and the unused beforeCreate/beforeUpdate
 * hooks are left out (section 13.2): use beforeSave().
 */
abstract class BaseController extends Controller
{
    /** @var class-string<Model> */
    protected string $model;
    protected array $with = [];
    protected array $withCount = [];
    protected array $searchable = [];
    protected array $filterable = [];
    protected array $exactFilters = ['status'];
    protected array $sortable = ['id'];
    /** @var class-string<\Illuminate\Http\Resources\Json\JsonResource>|null */
    protected ?string $resource = null;
    protected array $activeColumns = ['id', 'name'];
    protected string $sortBy = 'name';
    protected string $sortDir = 'asc';
    /** relation => label; a non-empty relation blocks delete (422 with `errors.in_use`). */
    protected array $inUseRelations = [];
    protected bool $requireInactiveBeforeDelete = true;
    protected array $undeletableStatuses = ['active'];
    protected string $activeStatus = 'active';
    protected string $archivedStatus = 'inactive';

    // ---------- Hooks ----------
    protected function storeRules(): array { return []; }
    protected function updateRules(Model $model): array { return $this->storeRules(); }
    protected function validationMessages(): array { return []; }
    protected function beforeSave(array $validated, ?Model $model): array { return $validated; }
    protected function afterCreate(Model $model, array $validated, Request $request): void {}
    protected function afterUpdate(Model $model, array $validated, Request $request): void {}
    protected function newQuery(): Builder
    {
        return $this->model::query()->with($this->with)->withCount($this->withCount);
    }
    protected function inUseMessage(array $blocks): string
    {
        return 'This record is in use: '.collect($blocks)->map(fn ($b) => "{$b['count']} {$b['label']}")->implode(', ').'.';
    }

    // ---------- Responses ----------
    protected function present(Model $model): mixed
    {
        return $this->resource ? (new ($this->resource)($model))->resolve() : $model->toArray();
    }

    protected function sendResponse(mixed $data, string $message = '', int $status = 200): JsonResponse
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data], $status);
    }

    protected function sendError(string $message, int $status = 422, array $errors = []): JsonResponse
    {
        return response()->json(array_filter(['success' => false, 'message' => $message, 'errors' => $errors ?: null], fn ($v) => $v !== null), $status);
    }

    // ---------- Reads ----------
    public function index(Request $request): JsonResponse
    {
        $query = $this->newQuery();
        $this->applySearch($query, (string) $request->query('search', ''));
        $this->applyFilters($query, (array) $request->query('filters', []));
        $this->applySort($query, $request);

        return $this->sendResponse($query->get()->map(fn ($m) => $this->present($m))->all());
    }

    public function paginationSearch(Request $request): JsonResponse
    {
        $perPage = max(1, min(1000, (int) $request->query('per_page', 10)));
        $filters = (array) $request->query('filters', []);
        $query = $this->newQuery();
        $this->applySearch($query, $search = (string) $request->query('search', ''));
        $this->applyFilters($query, $filters);
        $this->applySort($query, $request);
        $page = $query->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn ($m) => $this->present($m))->all(),
            'meta' => [
                'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(),
                'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem(),
            ],
            'links' => ['next' => $page->nextPageUrl(), 'prev' => $page->previousPageUrl()],
            'filterable' => $this->filterable, 'searchable' => $this->searchable,
            'filters' => $filters, 'search' => $search,
            'sort_by' => $request->query('sort_by', $this->sortBy), 'sort_dir' => $request->query('sort_dir', $this->sortDir),
        ]);
    }

    public function searchActive(): JsonResponse
    {
        $rows = $this->model::query()->where('status', $this->activeStatus)->orderBy($this->sortBy, $this->sortDir)->get($this->activeColumns);

        return $this->sendResponse($rows);
    }

    public function lookup(Request $request): JsonResponse
    {
        $query = $this->model::query();
        if ($request->query('status')) $query->where('status', $request->query('status'));
        $this->applySearch($query, (string) $request->query('q', ''));

        return $this->sendResponse($query->orderBy($this->sortBy, $this->sortDir)->limit(50)->get()->map(fn ($m) => ['value' => (string) $m->id, 'label' => $m->name])->all());
    }

    public function inUse(int $id): JsonResponse
    {
        return $this->sendResponse($this->usage($this->model::query()->findOrFail($id)));
    }

    // ---------- Writes ----------
    public function store(Request $request): JsonResponse
    {
        $validated = $this->validated($request, $this->storeRules());
        $model = DB::transaction(function () use ($validated, $request) {
            $model = $this->model::create($this->beforeSave($validated, null));
            $this->afterCreate($model, $validated, $request);

            return $model;
        });

        return $this->sendResponse($this->present($this->fresh($model)), 'Saved', 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $model = $this->model::query()->findOrFail($id);
        $validated = $this->validated($request, $this->updateRules($model));
        DB::transaction(function () use ($model, $validated, $request) {
            $model->update($this->beforeSave($validated, $model));
            $this->afterUpdate($model, $validated, $request);
        });

        return $this->sendResponse($this->present($this->fresh($model)), 'Saved');
    }

    public function archive(int $id): JsonResponse
    {
        $model = $this->model::query()->findOrFail($id);
        $model->update(['status' => $this->archivedStatus]);

        return $this->sendResponse($this->present($this->fresh($model)), 'Archived');
    }

    public function restore(int $id): JsonResponse
    {
        $model = $this->model::query()->findOrFail($id);
        $model->update(['status' => $this->activeStatus]);

        return $this->sendResponse($this->present($this->fresh($model)), 'Restored');
    }

    public function destroy(int $id): JsonResponse
    {
        DB::transaction(function () use ($id) {
            $model = $this->model::query()->lockForUpdate()->findOrFail($id);
            if ($this->requireInactiveBeforeDelete && in_array($model->status ?? null, $this->undeletableStatuses, true)) {
                throw new ApiException('Archive this record before deleting it.');
            }
            $blocks = $this->usage($model);
            if ($blocks) throw new ApiException($this->inUseMessage($blocks), 422, ['in_use' => $blocks]);
            $this->beforeDelete($model);
            $model->delete();
        });

        return response()->json(null, 204);
    }

    protected function beforeDelete(Model $model): void {}

    // ---------- Internals ----------
    /** @return array<int, array{label: string, count: int}> */
    protected function usage(Model $model): array
    {
        $blocks = [];
        foreach ($this->inUseRelations as $relation => $label) {
            $count = $model->{$relation}()->count();
            if ($count > 0) $blocks[] = ['label' => $label, 'count' => $count];
        }

        return $blocks;
    }

    protected function fresh(Model $model): Model
    {
        return $this->newQuery()->findOrFail($model->getKey());
    }

    protected function validated(Request $request, array $rules): array
    {
        return Validator::make($request->all(), $rules, $this->validationMessages())->validate();
    }

    protected function applySearch(Builder $query, string $term): void
    {
        $term = trim($term);
        if ($term === '' || ! $this->searchable) return;
        $query->where(function (Builder $q) use ($term) {
            foreach ($this->searchable as $col) $q->orWhere($col, 'like', '%'.addcslashes($term, '%_\\').'%');
        });
    }

    protected function applyFilters(Builder $query, array $filters): void
    {
        foreach ($filters as $col => $value) {
            if (! in_array($col, $this->filterable, true) || $value === '' || $value === null) continue;
            in_array($col, $this->exactFilters, true) ? $query->where($col, $value) : $query->where($col, 'like', '%'.$value.'%');
        }
    }

    protected function applySort(Builder $query, Request $request): void
    {
        $by = $request->query('sort_by', $this->sortBy);
        $dir = strtolower((string) $request->query('sort_dir', $this->sortDir)) === 'desc' ? 'desc' : 'asc';
        $query->orderBy(in_array($by, $this->sortable, true) ? $by : $this->sortBy, $dir);
    }
}
