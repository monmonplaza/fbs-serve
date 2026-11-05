import { db } from './db';
import { out, fail, uid, syncTable, tableOf } from './core';
import { resProblem } from '@/lib/reservations';
import { tm } from '@/lib/format';
import type { OrderItem, Reservation } from './types';

export interface ReservationInput { name: string; phone: string; pax: number; at: number; tableId: string | null; note: string; order: OrderItem[] | null }

const sod = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return +d; };
const whenText = (ts: number) => `${new Date(ts).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}, ${tm(ts)}`;
const find = (id: string) => db.reservations.find(r => r.id === id) ?? fail('Reservation not found');
const problem = (tableId: string | null, pax: number, at: number, ignoreId?: string) => resProblem(db.tables, db.reservations, tableId, pax, at, ignoreId);
const log = (r: Reservation, text: string) => r.history.push({ at: Date.now(), text });

export const reservations = {
  list: async () => out(db.reservations),

  create: async (v: ReservationInput) => {
    if (!v.name.trim() || !isFinite(v.at) || !(v.pax >= 1)) fail('Fill in the name, guests, date and time');
    const p = problem(v.tableId, v.pax, v.at); if (p) fail(p);
    const r: Reservation = { id: uid(), status: 'booked', history: [{ at: Date.now(), text: 'Booked' }], ...v };
    db.reservations.push(r);
    return out(r);
  },

  update: async (id: string, v: ReservationInput) => {
    const r = find(id);
    if (!v.name.trim() || !isFinite(v.at) || !(v.pax >= 1)) fail('Fill in the name, guests, date and time');
    const p = problem(v.tableId, v.pax, v.at, id); if (p) fail(p);
    if (r.at !== v.at) r.dismissed = false;
    Object.assign(r, v);
    log(r, 'Edited');
    return out(r);
  },

  /** Reschedule to another date, time or table. */
  move: async (id: string, at: number, tableId: string | null, reason: string) => {
    const r = find(id);
    if (!isFinite(at)) fail('Pick a date and time');
    if (at === r.at && tableId === (r.tableId || null)) fail('Pick a different date, time or table');
    const p = problem(tableId, r.pax, at, r.id); if (p) fail(p);
    log(r, `Rescheduled from ${whenText(r.at)}${reason ? ': ' + reason : ''}`);
    Object.assign(r, { at, tableId, dismissed: false });
    return out(r);
  },

  /** Dragging a booked reservation to another calendar day keeps its time. */
  moveToDay: async (id: string, day: number) => {
    const r = find(id);
    if (r.status !== 'booked') fail('Only booked reservations can be moved');
    if (sod(r.at) === day) return out(r);
    const nd = new Date(day), od = new Date(r.at);
    nd.setHours(od.getHours(), od.getMinutes(), 0, 0);
    const p = problem(r.tableId, r.pax, +nd, r.id); if (p) fail(p);
    log(r, `Rescheduled from ${whenText(r.at)} (dragged on the calendar)`);
    r.at = +nd; r.dismissed = false;
    return out(r);
  },

  cancel: async (id: string, reason: string) => {
    const r = find(id);
    Object.assign(r, { status: 'cancelled', cancelReason: reason, dismissed: true });
    log(r, `Cancelled${reason ? ': ' + reason : ''}`);
    return out(r);
  },

  noShow: async (id: string) => {
    const r = find(id);
    r.status = 'noshow'; r.dismissed = true; log(r, 'Marked as no-show');
    return out(r);
  },

  restore: async (id: string) => {
    const r = find(id);
    r.status = 'booked'; r.dismissed = false; log(r, 'Restored');
    return out(r);
  },

  dismiss: async (id: string) => { const r = db.reservations.find(x => x.id === id); if (r) r.dismissed = true; },

  /** Seats a booked reservation: activates the table and puts the advance order on its plate. Returns the table so the UI can show its QR. */
  seat: async (id: string, tableId: string) => {
    const r = find(id);
    if (r.status !== 'booked') fail('Only booked reservations can be seated');
    const t = tableOf(tableId);
    if (!t || t.status !== 'inactive') fail('That table is in use');
    const tb = t!;
    Object.assign(tb, { status: 'active', token: uid(), openedAt: Date.now(), bill: null, guests: r.pax });
    db.plates[tb.id] = (r.order || []).map(i => ({ id: uid(), foodId: i.foodId, variantId: i.variantId, qty: i.qty, by: r.name }));
    syncTable(tb);
    Object.assign(r, { status: 'arrived', tableId: tb.id });
    log(r, `Seated at ${tb.name}`);
    return out({ reservation: r, table: tb });
  },
};
