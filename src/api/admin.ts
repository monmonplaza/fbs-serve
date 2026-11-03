// Settings: payment methods, discounts, roles, users and the table timer.
import { db } from './db';
import { out } from './core';

export const admin = {
  updateProfile: async (id: string, p: { name: string }) => { const u = db.users.find(x => x.id === id); if (u) u.name = p.name; return out(u); },
  payments: async () => out(db.payments),
  discounts: async () => out(db.discounts),
  roles: async () => out(db.roles),
  users: async () => out(db.users),
  settings: async () => out(db.settings),
};
