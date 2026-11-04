// Foods and categories against the Laravel backend. Same method names and shapes as ./catalog.ts (the mock).
import { createCrudResource } from './http/crud';
import type { Category, Food, FoodStatus } from './types';
import type { FoodInput } from './catalog';

const foodsApi = createCrudResource<Food, FoodInput>({ baseUrl: '/foods' });
const categoriesApi = createCrudResource<Category>({ baseUrl: '/categories' });

export const catalogHttp = {
  foods: () => foodsApi.getAll(),
  categories: () => categoriesApi.getAll(),
  createFood: (input: FoodInput) => foodsApi.create(input),
  updateFood: (id: string, input: FoodInput) => foodsApi.update(id, input),
  deleteFood: (id: string) => foodsApi.delete(id),
  setFoodStatus: (id: string, status: FoodStatus) => foodsApi.update(id, { status } as FoodInput),
};
