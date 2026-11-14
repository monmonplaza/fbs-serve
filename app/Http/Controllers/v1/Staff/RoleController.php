<?php

namespace App\Http\Controllers\v1\Staff;

use App\Exceptions\ApiException;
use App\Http\Controllers\v1\BaseController;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class RoleController extends BaseController
{
    /** Module ids of the UI navigation (resources/js/lib/constants.ts). */
    public const MODULES = ['dashboard', 'orders', 'reservations', 'kitchen', 'foods', 'tables', 'inventory', 'settings', 'guide'];

    protected string $model = Role::class;

    protected ?string $resource = RoleResource::class;

    protected array $searchable = ['name'];

    protected array $sortable = ['id', 'name'];

    protected string $sortBy = 'id';

    protected array $inUseRelations = ['users' => 'users'];

    protected bool $requireInactiveBeforeDelete = false;

    protected function storeRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:app_roles,name'],
            'modules' => ['present', 'array'],
            'modules.*' => ['string', Rule::in(self::MODULES)],
        ];
    }

    protected function updateRules(Model $model): array
    {
        return ['name' => ['required', 'string', 'max:255', Rule::unique('app_roles', 'name')->ignore($model->id)]] + $this->storeRules();
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        return ['name' => trim($validated['name']), 'modules' => array_values(array_unique($validated['modules']))];
    }

    protected function beforeDelete(Model $model): void
    {
        if ($model->is_admin) {
            throw new ApiException('The Admin role cannot be deleted.');
        }
    }

    protected function inUseMessage(array $blocks): string
    {
        return "{$blocks[0]['count']} users have this role. Give them another role first.";
    }
}
