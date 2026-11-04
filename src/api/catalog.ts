// Foods and categories.
import { db } from './db';
import { out, fail, uid } from './core';
import type { Food, FoodStatus, FoodTag, Variant } from './types';
import { r2 } from '@/lib/format';

export interface FoodInput {
  name: string; cat: string; price: number; eta: number; desc: string; status: FoodStatus; tags: FoodTag[]; photos: string[];
  variants: { id?: string; name: string; price: number }[];
}

/** Normalises a form: trims, drops blank variants, rejects duplicate variant names, and sets price to the lowest variant price. */
function build(input: FoodInput): Omit<Food, 'id'> {
  const name = input.name.trim();
  if (!name) fail('Name is required');
  const variants: Variant[] = input.variants
    .map(v => ({ id: v.id || uid(), name: v.name.trim(), price: r2(+v.price) }))
    .filter(v => v.name);
  if (new Set(variants.map(v => v.name.toLowerCase())).size !== variants.length) fail('Each variant needs a different name');
  const price = variants.length ? Math.min(...variants.map(v => v.price)) : r2(+input.price);
  return {
    name, cat: input.cat, price, eta: Math.round(+input.eta), desc: input.desc.trim(), status: input.status, tags: [...input.tags], photos: [...input.photos],
    ...(variants.length ? { variants } : {}),
  };
}

export const catalog = {
  foods: async () => out(db.foods),
  categories: async () => out(db.categories),
  createFood: async (input: FoodInput) => {
    const f: Food = { id: 'f' + uid(), ...build(input) };
    db.foods.push(f);
    return out(f);
  },
  updateFood: async (id: string, input: FoodInput) => {
    const f = db.foods.find(x => x.id === id);
    if (!f) return fail('Food not found');
    const v = build(input);
    delete f.variants;
    Object.assign(f, v);
    return out(f);
  },
  deleteFood: async (id: string) => {
    const f = db.foods.find(x => x.id === id);
    if (!f) return fail('Food not found');
    db.foods = db.foods.filter(x => x.id !== id);
    return out(f);
  },
  setFoodStatus: async (id: string, status: FoodStatus) => {
    const f = db.foods.find(x => x.id === id);
    if (!f) return fail('Food not found');
    f.status = status;
    return out(f);
  },
};
