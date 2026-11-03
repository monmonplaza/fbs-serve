// Tables, floors and QR sessions.
import { db } from './db';
import { out } from './core';

export const tables = {
  list: async () => out(db.tables),
  floors: async () => out(db.floors),
};
