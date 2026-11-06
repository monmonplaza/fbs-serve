<?php

namespace App\Http\Controllers\v1\Menu;

use App\Exceptions\ApiException;
use App\Http\Controllers\v1\BaseController;
use App\Http\Resources\FoodResource;
use App\Models\Food;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FoodController extends BaseController
{
    protected string $model = Food::class;

    protected ?string $resource = FoodResource::class;

    protected array $with = ['variants', 'photos'];

    protected array $searchable = ['name', 'description'];

    protected array $filterable = ['status', 'category_id'];

    protected array $exactFilters = ['status', 'category_id'];

    protected array $sortable = ['id', 'name', 'price', 'eta_minutes', 'status', 'created_at'];

    protected array $activeColumns = ['id', 'name', 'price'];

    protected string $sortBy = 'id';

    protected bool $requireInactiveBeforeDelete = false;

    protected string $activeStatus = 'available';

    protected string $archivedStatus = 'unavailable';

    /** `sometimes` lets the same rules serve a partial update such as { status } from the availability switch. */
    protected function storeRules(): array
    {
        return $this->rules(false);
    }

    protected function updateRules(Model $model): array
    {
        return $this->rules(true);
    }

    private function rules(bool $partial): array
    {
        $req = $partial ? ['sometimes', 'required'] : ['required'];

        return [
            'cat' => [...$req, 'exists:app_categories,id'],
            'name' => [...$req, 'string', 'max:255'],
            'price' => [$partial ? 'sometimes' : 'required_without:variants', 'nullable', 'numeric', 'min:0', 'max:99999999'],
            'eta' => [...$req, 'integer', 'min:1', 'max:600'],
            'desc' => ['nullable', 'string', 'max:1000'],
            'status' => [...$req, Rule::in(['available', 'unavailable'])],
            'tags' => ['sometimes', 'array'],
            'tags.*' => [Rule::in(['new', 'must', 'best'])],
            'photos' => ['sometimes', 'array', 'max:12'],
            'photos.*' => ['string', 'max:6000000'],
            'variants' => ['sometimes', 'array', 'max:20'],
            'variants.*.id' => ['nullable'],
            'variants.*.name' => ['nullable', 'string', 'max:255'],
            'variants.*.price' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
        ];
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        $data = [];
        foreach (['name' => 'name', 'cat' => 'category_id', 'desc' => 'description', 'eta' => 'eta_minutes', 'status' => 'status', 'tags' => 'tags'] as $in => $col) {
            if (array_key_exists($in, $validated)) {
                $data[$col] = is_string($validated[$in]) ? trim($validated[$in]) : $validated[$in];
            }
        }
        if (array_key_exists('desc', $validated)) {
            $data['description'] = trim((string) $validated['desc']);
        }

        $variants = $this->cleanVariants($validated);
        if ($variants !== null && $variants) {
            $data['price'] = round(min(array_column($variants, 'price')), 2);
        } elseif (array_key_exists('price', $validated) && $validated['price'] !== null) {
            $data['price'] = round((float) $validated['price'], 2);
        } elseif ($model === null) {
            $data['price'] = 0;
        }

        return $data;
    }

    protected function afterCreate(Model $model, array $validated, Request $request): void
    {
        $this->syncChildren($model, $validated);
    }

    protected function afterUpdate(Model $model, array $validated, Request $request): void
    {
        $this->syncChildren($model, $validated);
    }

    /** Trims, drops blank rows, rejects duplicate names. Null when the request did not send `variants` at all. */
    private function cleanVariants(array $validated): ?array
    {
        if (! array_key_exists('variants', $validated)) {
            return null;
        }
        $rows = collect($validated['variants'])
            ->map(fn ($v) => ['id' => $v['id'] ?? null, 'name' => trim((string) ($v['name'] ?? '')), 'price' => round((float) ($v['price'] ?? 0), 2)])
            ->filter(fn ($v) => $v['name'] !== '')->values();
        if ($rows->pluck('name')->map(fn ($n) => mb_strtolower($n))->unique()->count() !== $rows->count()) {
            throw new ApiException('Each variant needs a different name');
        }

        return $rows->all();
    }

    private function syncChildren(Model $food, array $validated): void
    {
        if (($variants = $this->cleanVariants($validated)) !== null) {
            $keep = [];
            foreach ($variants as $i => $v) {
                $row = $v['id'] ? $food->variants()->whereKey($v['id'])->first() : null;
                $attrs = ['name' => $v['name'], 'price' => $v['price'], 'position' => $i];
                $row ? $row->update($attrs) : $row = $food->variants()->create($attrs);
                $keep[] = $row->id;
            }
            $food->variants()->whereNotIn('id', $keep)->delete();
        }
        if (array_key_exists('photos', $validated)) {
            $food->photos()->delete();
            foreach (array_values($validated['photos']) as $i => $path) {
                $food->photos()->create(['path' => $path, 'position' => $i]);
            }
        }
    }
}
