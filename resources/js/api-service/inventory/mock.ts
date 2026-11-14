/**
 * @file api-service/inventory/mock.ts
 * Ingredients, stock and recipes without a backend. Stock leaves when the kitchen bumps an order, the same rule as the server.
 */

import { db } from "@/api-service/mock/db";
import { out, fail, uid } from "@/api-service/mock/core";
import type { Ingredient, Order, RecipeLine, StockMovement, StockMovementType } from "@/types/restaurant";

export interface IngredientInput {
    name: string;
    unit: string;
    onHand?: number;
    reorderLevel: number;
    cost: number | null;
    active: boolean;
}

const isLow = (i: Ingredient) => i.onHand <= 0 || (i.reorderLevel > 0 && i.onHand <= i.reorderLevel);
const round3 = (n: number) => Math.round(n * 1000) / 1000;

const state = (() => {
    // name => [unit, opening stock, reorder level, cost]
    const seed: Record<string, [string, number, number, number]> = {
        Rice: ["g", 20000, 5000, 0.06],
        Garlic: ["g", 1500, 300, 0.12],
        "Cooking oil": ["ml", 12000, 3000, 0.09],
        Pork: ["g", 15000, 4000, 0.32],
        Squid: ["g", 5000, 1200, 0.35],
    };
    const ingredients: Ingredient[] = Object.entries(seed).map(([name, [unit, onHand, reorderLevel, cost]], i) => ({
        id: "i" + (i + 1),
        name,
        unit,
        onHand,
        reorderLevel,
        cost,
        active: true,
        low: false,
    }));
    const byName = (n: string) => ingredients.find((x) => x.name === n)!.id;
    const recipes: Record<string, RecipeLine[]> = {};
    const dish = (name: string, lines: [string, number][]) => {
        const f = db.foods.find((x) => x.name === name);
        if (f) recipes[f.id] = lines.map(([n, qty]) => ({ ingredientId: byName(n), variantId: null, qty }));
    };
    dish("Garlic Rice", [
        ["Rice", 180],
        ["Garlic", 8],
        ["Cooking oil", 10],
    ]);
    dish("Java Rice", [
        ["Rice", 180],
        ["Cooking oil", 10],
    ]);
    dish("Calamares", [
        ["Squid", 200],
        ["Cooking oil", 80],
    ]);
    dish("Lumpiang Shanghai", [
        ["Pork", 120],
        ["Cooking oil", 60],
    ]);
    const movements: StockMovement[] = [];
    ingredients.forEach((i) => (i.low = isLow(i)));
    return { ingredients, recipes, movements };
})();

const find = (id: string) => state.ingredients.find((i) => i.id === id) ?? fail("Ingredient not found");

function move(
    i: Ingredient,
    type: StockMovementType,
    qty: number,
    note: string | null,
    ref: string | null,
    by: string,
) {
    i.onHand = round3(i.onHand + qty);
    i.low = isLow(i);
    state.movements.unshift({
        id: uid(),
        ingredientId: i.id,
        ingredient: i.name,
        unit: i.unit,
        type,
        qty: round3(qty),
        balance: i.onHand,
        note: note?.trim() || null,
        ref,
        by,
        at: Date.now(),
    });
}
const positive = (n: number) => (n > 0 ? n : fail("Enter an amount above zero."));

/** The bump: the ingredients of a completed order leave the stock, once. Dishes without a recipe are not tracked. */
export function useStockForOrder(o: Order) {
    const used = ((o as Order & { stockUsed?: boolean }).stockUsed ??= false);
    if (used) return;
    const need = new Map<string, number>();
    for (const item of o.items)
        for (const l of state.recipes[item.foodId] ?? [])
            if (l.variantId === null || l.variantId === item.variantId)
                need.set(l.ingredientId, (need.get(l.ingredientId) ?? 0) + l.qty * item.qty);
    need.forEach((qty, id) => move(find(id), "used", -qty, null, o.id, "Kitchen"));
    (o as Order & { stockUsed?: boolean }).stockUsed = true;
}

export const inventory = {
    ingredients: async () => out([...state.ingredients].sort((a, b) => a.name.localeCompare(b.name))),
    saveIngredient: async (id: string | null, v: IngredientInput) => {
        const name = v.name.trim();
        if (!name || !v.unit.trim()) fail("Enter a name and a unit.");
        if (state.ingredients.some((i) => i.id !== id && i.name.toLowerCase() === name.toLowerCase()))
            fail("The name has already been taken.");
        let i: Ingredient;
        if (id) {
            i = find(id);
            Object.assign(i, {
                name,
                unit: v.unit.trim(),
                reorderLevel: v.reorderLevel,
                cost: v.cost,
                active: v.active,
            });
        } else {
            i = {
                id: uid(),
                name,
                unit: v.unit.trim(),
                onHand: 0,
                reorderLevel: v.reorderLevel,
                cost: v.cost,
                active: v.active,
                low: false,
            };
            state.ingredients.push(i);
            if ((v.onHand ?? 0) > 0) move(i, "received", v.onHand!, "Opening stock", null, "Staff");
        }
        i.low = isLow(i);
        return out(i);
    },
    deleteIngredient: async (id: string) => {
        const used = Object.values(state.recipes).some((lines) => lines.some((l) => l.ingredientId === id));
        if (used) fail("This ingredient is used in recipes. Take it out of the recipes first, or turn it off instead.");
        state.ingredients.splice(state.ingredients.indexOf(find(id)), 1);
    },
    receive: async (id: string, qty: number, note: string) => {
        const i = find(id);
        move(i, "received", positive(qty), note, null, "Staff");
        return out(i);
    },
    waste: async (id: string, qty: number, note: string) => {
        const i = find(id);
        move(i, "waste", -positive(qty), note, null, "Staff");
        return out(i);
    },
    count: async (id: string, counted: number, note: string) => {
        const i = find(id);
        if (!(counted >= 0)) fail("Enter the counted amount.");
        move(i, "count", counted - i.onHand, note, null, "Staff");
        return out(i);
    },
    movements: async (ingredientId?: string) =>
        out(state.movements.filter((m) => !ingredientId || m.ingredientId === ingredientId).slice(0, 200)),
    recipe: async (foodId: string) => out(state.recipes[foodId] ?? []),
    saveRecipe: async (foodId: string, lines: RecipeLine[]) => {
        const merged = new Map<string, RecipeLine>();
        for (const l of lines) {
            if (!(l.qty > 0)) fail("Enter an amount above zero.");
            const key = l.ingredientId + "|" + (l.variantId ?? "");
            const m = merged.get(key);
            if (m) m.qty += l.qty;
            else merged.set(key, { ...l });
        }
        state.recipes[foodId] = [...merged.values()];
        return out(state.recipes[foodId]);
    },
};
