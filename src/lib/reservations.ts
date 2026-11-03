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
