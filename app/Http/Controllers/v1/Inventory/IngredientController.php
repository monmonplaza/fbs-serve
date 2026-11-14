<?php

namespace App\Http\Controllers\v1\Inventory;

use App\Http\Controllers\v1\BaseController;
use App\Http\Resources\IngredientResource;
use App\Models\Food;
use App\Models\Ingredient;
use App\Models\StockMovement;
use App\Support\StockService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Ingredients, their stock, the movement log, and the recipe of each dish. */
class IngredientController extends BaseController
{
    protected string $model = Ingredient::class;

    protected ?string $resource = IngredientResource::class;

    protected array $searchable = ['name'];

    protected array $sortable = ['id', 'name', 'on_hand'];

    protected bool $requireInactiveBeforeDelete = false;

    protected array $inUseRelations = ['recipeLines' => 'recipes'];

    protected function inUseMessage(array $blocks): string
    {
        return 'This ingredient is used in recipes. Take it out of the recipes first, or turn it off instead.';
    }

    protected function storeRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:app_ingredients,name'],
            'unit' => ['required', 'string', 'max:12'],
            'onHand' => ['sometimes', 'numeric', 'min:0', 'max:99999999'],
            'reorderLevel' => ['sometimes', 'numeric', 'min:0', 'max:99999999'],
            'cost' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'active' => ['sometimes', 'boolean'],
        ];
    }

    protected function updateRules(Model $model): array
    {
        // Stock changes only through receive, waste and count, so the movement log stays complete.
        return ['name' => ['required', 'string', 'max:255', Rule::unique('app_ingredients', 'name')->ignore($model->id)]] + collect($this->storeRules())->except(['name', 'onHand'])->all();
    }

    protected function beforeSave(array $validated, ?Model $model): array
    {
        $data = ['name' => trim($validated['name']), 'unit' => trim($validated['unit']), 'active' => $validated['active'] ?? ($model?->active ?? true)];
        if (array_key_exists('reorderLevel', $validated)) {
            $data['reorder_level'] = $validated['reorderLevel'];
        }
        if (array_key_exists('cost', $validated)) {
            $data['cost'] = $validated['cost'];
        }
        if ($model === null) {
            $data['on_hand'] = 0; // the opening stock is logged by afterCreate
        }

        return $data;
    }

    protected function afterCreate(Model $model, array $validated, Request $request): void
    {
        if (($open = (float) ($validated['onHand'] ?? 0)) > 0) {
            StockService::change($model, 'received', $open, 'Opening stock', $this->by($request));
        }
    }

    /** POST /ingredients/{id}/receive: stock delivered. */
    public function receive(Request $request, int $id): JsonResponse
    {
        $v = $request->validate(['qty' => ['required', 'numeric', 'max:99999999'], 'note' => ['nullable', 'string', 'max:255']]);
        StockService::change(Ingredient::query()->findOrFail($id), 'received', StockService::positive((float) $v['qty']), $v['note'] ?? null, $this->by($request));

        return $this->sendResponse((new IngredientResource(Ingredient::query()->findOrFail($id)))->resolve(), 'Stock received');
    }

    /** POST /ingredients/{id}/waste: spoiled, spilled or given away. */
    public function waste(Request $request, int $id): JsonResponse
    {
        $v = $request->validate(['qty' => ['required', 'numeric', 'max:99999999'], 'note' => ['nullable', 'string', 'max:255']]);
        StockService::change(Ingredient::query()->findOrFail($id), 'waste', -StockService::positive((float) $v['qty']), $v['note'] ?? null, $this->by($request));

        return $this->sendResponse((new IngredientResource(Ingredient::query()->findOrFail($id)))->resolve(), 'Waste recorded');
    }

    /** POST /ingredients/{id}/count: a physical count sets the stock. */
    public function count(Request $request, int $id): JsonResponse
    {
        $v = $request->validate(['counted' => ['required', 'numeric', 'min:0', 'max:99999999'], 'note' => ['nullable', 'string', 'max:255']]);
        StockService::count(Ingredient::query()->findOrFail($id), (float) $v['counted'], $v['note'] ?? null, $this->by($request));

        return $this->sendResponse((new IngredientResource(Ingredient::query()->findOrFail($id)))->resolve(), 'Stock counted');
    }

    /** GET /stock-movements: the latest changes, newest first (optionally for one ingredient). */
    public function movements(Request $request): JsonResponse
    {
        $q = StockMovement::query()->with('ingredient:id,name,unit')->orderByDesc('id')->limit(200);
        if ($request->filled('ingredient')) {
            $q->where('ingredient_id', (int) $request->query('ingredient'));
        }

        return $this->sendResponse($q->get()->map(fn (StockMovement $m) => [
            'id' => (string) $m->id, 'ingredientId' => (string) $m->ingredient_id, 'ingredient' => $m->ingredient?->name, 'unit' => $m->ingredient?->unit,
            'type' => $m->type, 'qty' => (float) $m->qty, 'balance' => (float) $m->balance, 'note' => $m->note, 'ref' => $m->ref, 'by' => $m->by,
            'at' => (int) $m->created_at->valueOf(),
        ])->all());
    }

    /** GET /foods/{id}/recipe */
    public function recipe(int $id): JsonResponse
    {
        $food = Food::query()->with('variants')->findOrFail($id);

        return $this->sendResponse($food->recipeLines()->orderBy('id')->get()->map(fn ($l) => [
            'ingredientId' => (string) $l->ingredient_id, 'variantId' => $l->variant_id === null ? null : (string) $l->variant_id, 'qty' => (float) $l->qty,
        ])->all());
    }

    /** POST /foods/{id}/recipe: replaces the dish's recipe. */
    public function saveRecipe(Request $request, int $id): JsonResponse
    {
        $food = Food::query()->with('variants')->findOrFail($id);
        $v = $request->validate([
            'lines' => ['present', 'array', 'max:40'],
            'lines.*.ingredientId' => ['required', 'exists:app_ingredients,id'],
            'lines.*.variantId' => ['nullable', Rule::in($food->variants->pluck('id')->all())],
            'lines.*.qty' => ['required', 'numeric', 'gt:0', 'max:99999999'],
        ], ['lines.*.variantId.in' => 'Pick one of this dish’s sizes.', 'lines.*.qty.gt' => 'Enter an amount above zero.']);
        StockService::saveRecipe($food->id, $v['lines']);

        return $this->recipe($id);
    }

    private function by(Request $request): string
    {
        return trim((string) $request->input('by', '')) ?: 'Staff';
    }
}
