// Kitchen queue: moving orders through cooking, plating, order out, served and ready for pickup.
import { db } from './db';
import { out } from './core';

export const kitchen = {
  queue: async () => out(db.orders.filter(o => ['queued', 'cooking', 'plating', 'completed'].includes(o.status))),
};
