<?php

namespace App\Http\Controllers;

use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class CategoryController extends BaseController
{
    protected string $model = Category::class;
    protected ?string $resource = CategoryResource::class;
    protected array $searchable = ['name'];
    protected array $filterable = ['status'];
    protected array $sortable = ['id', 'name'];
    protected array $inUseRelations = ['foods' => 'foods'];
    protected bool $requireInactiveBeforeDelete = false;

    protected function storeRules(): array
    {
        return ['name' => ['required', 'string', 'max:255', 'unique:app_categories,name'], 'desc' => ['nullable', 'string', 'max:255']];
    }

    protected function updateRules(Model $model): array
    {
        return ['name' => ['required', 'string', 'max:255', Rule::unique('app_categories', 'name')->ignore($model->id)], 'desc' => ['nullable', 'string', 'max:255']];
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        return ['name' => trim($validated['name']), 'description' => trim($validated['desc'] ?? '')];
    }

    protected function inUseMessage(array $blocks): string
    {
        return "{$blocks[0]['count']} foods use this category. Move them to another category first.";
    }
}
