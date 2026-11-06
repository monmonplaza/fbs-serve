/**
 * @file api-service/catalog/http.ts
 * Foods and categories against the Laravel backend. Same method names and shapes as ./mock.ts.
 */

import { createCrudResource } from "@/api-service/http";
import type { Category, Food, FoodStatus } from "@/types/restaurant";
import type { FoodInput } from "@/api-service/catalog/mock";

const foodsApi = createCrudResource<Food, FoodInput>({ baseUrl: "/foods" });
const categoriesApi = createCrudResource<Category>({ baseUrl: "/categories" });

export const catalogHttp = {
    foods: () => foodsApi.getAll(),
    categories: () => categoriesApi.getAll(),
    createFood: (input: FoodInput) => foodsApi.create(input),
    updateFood: (id: string, input: FoodInput) => foodsApi.update(id, input),
    deleteFood: (id: string) => foodsApi.delete(id),
    setFoodStatus: (id: string, status: FoodStatus) => foodsApi.update(id, { status } as FoodInput),
};
