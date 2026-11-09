<?php

namespace App\Http\Controllers\v1\Orders;

use App\Http\Controllers\v1\BaseController;
use App\Http\Resources\PaymentMethodResource;
use App\Models\PaymentMethod;
use App\Support\StoredFile;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class PaymentMethodController extends BaseController
{
    protected string $model = PaymentMethod::class;

    protected ?string $resource = PaymentMethodResource::class;

    protected array $searchable = ['name'];

    protected array $sortable = ['id', 'name'];

    protected string $sortBy = 'id';

    protected array $inUseRelations = ['orders' => 'orders', 'payments' => 'payments', 'billRequests' => 'bill requests'];

    protected bool $requireInactiveBeforeDelete = false;

    protected function inUseMessage(array $blocks): string
    {
        return 'This payment method is already used in orders and cannot be deleted. Turn off "Guests can choose this" instead.';
    }

    protected function storeRules(): array
    {
        return ['name' => ['required', 'string', 'max:255', 'unique:app_payment_methods,name'], 'details' => ['nullable', 'string', 'max:255'], 'active' => ['sometimes', 'boolean'], 'needsRef' => ['sometimes', 'boolean'], 'qr' => ['sometimes', 'nullable', 'string', 'max:4000000']];
    }

    protected function updateRules(Model $model): array
    {
        return ['name' => ['required', 'string', 'max:255', Rule::unique('app_payment_methods', 'name')->ignore($model->id)]] + $this->storeRules();
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        $qr = array_key_exists('qr', $validated) ? StoredFile::toPath($validated['qr'] ?: null) : $model?->qr;
        if ($model && $qr !== $model->qr) {
            StoredFile::forget([$model->qr]); // the old QR picture is replaced or removed
        }

        return ['name' => trim($validated['name']), 'details' => trim($validated['details'] ?? ''), 'active' => $validated['active'] ?? ($model?->active ?? true), 'needs_ref' => $validated['needsRef'] ?? ($model?->needs_ref ?? false),
            'qr' => $qr];
    }

    protected function beforeDelete(Model $model): void
    {
        StoredFile::forget([$model->qr]);
    }
}
