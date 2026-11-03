// Foods and categories.
import { db } from './db';
import { out } from './core';

export const catalog = {
  foods: async () => out(db.foods),
  categories: async () => out(db.categories),
};
