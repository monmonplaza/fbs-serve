<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Http\Resources\FloorResource;
use App\Models\Floor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class FloorController extends BaseController
{
    protected string $model = Floor::class;
    protected ?string $resource = FloorResource::class;
    protected array $searchable = ['name'];
    protected array $sortable = ['id', 'name'];
    protected string $sortBy = 'id';
    protected array $inUseRelations = ['tables' => 'tables'];
    protected bool $requireInactiveBeforeDelete = false;

    protected function storeRules(): array
    {
        return ['name' => ['required', 'string', 'max:255', 'unique:app_floors,name']];
    }

    protected function updateRules(Model $model): array
    {
        return ['name' => ['required', 'string', 'max:255', Rule::unique('app_floors', 'name')->ignore($model->id)]];
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        return ['name' => trim($validated['name'])];
    }

    protected function beforeDelete(Model $model): void
    {
        if (Floor::count() === 1) throw new ApiException('The restaurant needs at least one floor level.');
    }

    protected function inUseMessage(array $blocks): string
    {
        return "{$blocks[0]['count']} tables are on this floor. Move or delete them first.";
    }
}
