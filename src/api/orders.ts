// Orders, kitchen and payments.
import { db } from './db';
import { out } from './core';

export const orders = {
  list: async () => out(db.orders),
};
