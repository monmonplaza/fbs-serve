import type { Reservation } from '@/api/types';

export const RES_MIN = 90;
export const REMIND_BEFORE = 20;
export const REMIND_AFTER = 15;

/** Booked reservations whose reminder window is open: REMIND_BEFORE minutes before the time until REMIND_AFTER after. */
export const dueReservations = (list: Reservation[], now = Date.now()) =>
  list.filter(r => r.status === 'booked' && !r.dismissed && now >= r.at - REMIND_BEFORE * 60000 && now <= r.at + REMIND_AFTER * 60000).sort((a, b) => a.at - b.at);

export const dueText = (r: Reservation, now = Date.now()) => {
  const m = Math.round((r.at - now) / 60000);
  return m > 0 ? `in ${m} min` : m === 0 ? 'now' : `${-m} min late`;
};

export const SHOW_BEFORE = 60;
export const SHOW_AFTER = 30;
export const resLive = (r: Pick<Reservation, 'status'>) => r.status === 'booked' || r.status === 'arrived';

/** A table shows as Reserved from SHOW_BEFORE minutes before its booking until SHOW_AFTER minutes after it. Returns the earliest such booking. */
export const reservedTable = (list: Reservation[], tableId: string, now = Date.now()) =>
  list.filter(r => r.tableId === tableId && r.status === 'booked' && now >= r.at - SHOW_BEFORE * 60000 && now <= r.at + SHOW_AFTER * 60000).sort((a, b) => a.at - b.at)[0];

/** Table problems for a booking: not enough seats, or another booking on the same table within RES_MIN minutes. Empty string when fine. */
export function resProblem(tables: { id: string; name: string; seats: number }[], list: Reservation[], tableId: string | null, pax: number, at: number, ignoreId?: string) {
  const t = tables.find(x => x.id === tableId);
  if (!t) return '';
  if (t.seats < pax) return `${t.name} seats only ${t.seats}.`;
  const c = list.find(x => x.id !== ignoreId && x.tableId === tableId && resLive(x) && at < x.at + RES_MIN * 60000 && x.at < at + RES_MIN * 60000);
  return c ? `${t.name} is already reserved by ${c.name} at ${new Date(c.at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}.` : '';
}
