/**
 * @file api-service/inventory/http.ts
 * Ingredients, stock and recipes against the Laravel backend. Same method names and shapes as ./mock.ts.
 */

import { http, unwrap } from "@/api-service/client";
import type { IngredientInput } from "@/api-service/inventory/mock";
import type { Ingredient, RecipeLine, StockMovement } from "@/types/restaurant";

export const inventoryHttp = {
    ingredients: async () => unwrap<Ingredient[]>(await http.get("/ingredients", { params: { per_page: 1000 } })),
    saveIngredient: async (id: string | null, v: IngredientInput) =>
        unwrap<Ingredient>(
            await http.post(id ? `/ingredients/${id}` : "/ingredients", id ? { ...v, onHand: undefined } : v),
        ),
    deleteIngredient: async (id: string) => {
        await http.delete(`/ingredients/${id}`);
    },
    receive: async (id: string, qty: number, note: string) =>
        unwrap<Ingredient>(await http.post(`/ingredients/${id}/receive`, { qty, note })),
    waste: async (id: string, qty: number, note: string) =>
        unwrap<Ingredient>(await http.post(`/ingredients/${id}/waste`, { qty, note })),
    count: async (id: string, counted: number, note: string) =>
        unwrap<Ingredient>(await http.post(`/ingredients/${id}/count`, { counted, note })),
    movements: async (ingredientId?: string) =>
        unwrap<StockMovement[]>(
            await http.get("/stock-movements", { params: ingredientId ? { ingredient: ingredientId } : {} }),
        ),
    recipe: async (foodId: string) => unwrap<RecipeLine[]>(await http.get(`/foods/${foodId}/recipe`)),
    saveRecipe: async (foodId: string, lines: RecipeLine[]) =>
        unwrap<RecipeLine[]>(await http.post(`/foods/${foodId}/recipe`, { lines })),
};
