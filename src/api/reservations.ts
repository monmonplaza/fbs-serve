import { db } from './db';
import { out } from './core';

export const reservations = {
  list: async () => out(db.reservations),
};
