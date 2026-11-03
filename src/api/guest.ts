// What the guest phone calls: the shared plate and sending it to the kitchen.
import { db } from './db';
import { out, tableOf } from './core';

export const guest = {
  /** Opened from a table QR code: the phone joins that table's session (the prototype has no server, so it creates it). */
  join: async (tableId: string, token: string) => {
    const t = tableOf(tableId);
    if (t) { Object.assign(t, { status: 'active', token, openedAt: Date.now(), bill: null }); db.plates[t.id] = []; }
  },
  plate: async (tableId: string) => out(db.plates[tableId] ?? []),
};
