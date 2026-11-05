<?php

namespace App\Http\Controllers;

use App\Http\Resources\DiscountResource;
use App\Models\Discount;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class DiscountController extends BaseController
{
    protected string $model = Discount::class;
    protected ?string $resource = DiscountResource::class;
    protected array $searchable = ['name'];
    protected array $sortable = ['id', 'name', 'pct'];
    protected string $sortBy = 'id';
    protected bool $requireInactiveBeforeDelete = false;

    protected function storeRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:app_discounts,name'],
            'pct' => ['required', 'numeric', 'min:0', 'max:100'],
            'note' => ['nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
        ];
    }

    protected function updateRules(Model $model): array
    {
        return ['name' => ['required', 'string', 'max:255', Rule::unique('app_discounts', 'name')->ignore($model->id)]] + $this->storeRules();
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        return ['name' => trim($validated['name']), 'pct' => $validated['pct'], 'note' => trim($validated['note'] ?? ''), 'active' => $validated['active'] ?? ($model?->active ?? true)];
    }
}
