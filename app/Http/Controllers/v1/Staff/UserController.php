<?php

namespace App\Http\Controllers\v1\Staff;

use App\Exceptions\ApiException;
use App\Http\Controllers\v1\BaseController;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class UserController extends BaseController
{
    protected string $model = User::class;

    protected ?string $resource = UserResource::class;

    protected array $searchable = ['name', 'username'];

    protected array $sortable = ['id', 'name', 'username'];

    protected string $sortBy = 'id';

    protected bool $requireInactiveBeforeDelete = false;

    protected function storeRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9._-]+$/', 'unique:users,username'],
            'role' => ['required', 'exists:app_roles,id'],
            'active' => ['sometimes', 'boolean'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
        ];
    }

    protected function updateRules(Model $model): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'username' => ['sometimes', 'required', 'string', 'max:40', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('users', 'username')->ignore($model->id)],
            'role' => ['sometimes', 'required', 'exists:app_roles,id'],
            'active' => ['sometimes', 'boolean'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($model->id)],
        ];
    }

    protected function validationMessages(): array
    {
        return ['username.regex' => 'The username can only have letters, numbers, dots, dashes and underscores.', 'username.unique' => 'That username is already taken.'];
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        $data = [];
        foreach (['name', 'username'] as $k) {
            if (isset($validated[$k])) {
                $data[$k] = trim($validated[$k]);
            }
        }
        if (isset($validated['role'])) {
            $data['role_id'] = $validated['role'];
        }
        if (array_key_exists('active', $validated)) {
            $data['active'] = $validated['active'];
        } elseif ($model === null) {
            $data['active'] = true;
        }
        if (array_key_exists('email', $validated)) {
            $data['email'] = $validated['email'] ? trim($validated['email']) : null;
        }
        if ($model !== null && $model->isActiveAdmin() && $this->losesAdmin($data, $model) && ! $this->otherActiveAdmin($model)) {
            throw new ApiException('At least one active Admin user is needed. Make another user an Admin first.');
        }

        return $data;
    }

    protected function beforeDelete(Model $model): void
    {
        if ($model->isActiveAdmin() && ! $this->otherActiveAdmin($model)) {
            throw new ApiException('At least one active Admin user is needed. Make another user an Admin first.');
        }
    }

    private function losesAdmin(array $data, User $user): bool
    {
        if (($data['active'] ?? $user->active) === false) {
            return true;
        }

        return isset($data['role_id']) && ! Role::query()->whereKey($data['role_id'])->where('is_admin', true)->exists();
    }

    private function otherActiveAdmin(User $user): bool
    {
        return User::query()->whereKeyNot($user->id)->where('active', true)->whereHas('role', fn ($q) => $q->where('is_admin', true))->exists();
    }
}
