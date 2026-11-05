import { api, ApiError } from '@/api';
import { invalidateOutside } from '@/api/queries';
import { openModal } from '@/store/modal';
import { toast } from '@/store/toast';
import { useUi } from '@/store/ui';
import type { Reservation } from '@/api/types';
import type { RowAction } from '@/components/RowActions';
import { sod, whenText, useResUi, initDraft } from './helpers';
import { ResModal, ResFormModal, ResOrderModal, ResMoveModal, ResCancelModal, SeatModal, JumpModal, SeatedQrModal } from './Modals';
import { closeModal } from '@/store/modal';

export const refresh = () => invalidateOutside('reservations', 'tables');
/** Runs an api call and shows the rule message when it is refused. Resolves true on success. */
export async function attempt(fn: () => Promise<unknown>) {
  try { await fn(); return true; } catch (e) { if (e instanceof ApiError) { toast(e.message); return false; } throw e; }
}

export const openRes = (r: Pick<Reservation, 'id' | 'name'>) => openModal({ title: r.name, content: <ResModal id={r.id} /> });

export const openResForm = (r: Reservation | null, dayTs?: number) => {
  initDraft(r, dayTs);
  openModal({ title: r ? 'Edit reservation' : 'New reservation', content: <ResFormModal /> });
};
export const openResFormStep = (edit: boolean) => openModal({ title: edit ? 'Edit reservation' : 'New reservation', content: <ResFormModal /> });
export const openResOrder = (name: string) => openModal({ title: `Advance order · ${name || 'reservation'}`, wide: true, content: <ResOrderModal /> });
export const openMove = (r: Reservation) => openModal({ title: `Reschedule ${r.name}`, content: <ResMoveModal id={r.id} /> });
export const openCancel = (r: Reservation) => openModal({ title: `Cancel ${r.name}?`, content: <ResCancelModal id={r.id} /> });
export const openSeatModal = (r: Reservation, msg = '') => openModal({ title: `Seat ${r.name}`, content: <SeatModal id={r.id} msg={msg} /> });
export const openJump = () => openModal({ title: 'Go to a date', content: <JumpModal /> });

/** Seats the reservation on a table, then shows that table's QR. */
export async function seatAt(r: Reservation, tableId: string) {
  let res;
  try { res = await api.reservations.seat(r.id, tableId); } catch (e) { if (e instanceof ApiError) { toast(e.message); return; } throw e; }
  await refresh();
  openModal({ title: `${res.table.name} QR code`, content: <SeatedQrModal tableId={res.table.id} /> });
  toast(`${r.name} seated at ${res.table.name}${r.order?.length ? '. Advance order is on the plate.' : ''}`);
}

/** Seat now: straight onto the booked table when it is free, otherwise ask which table. */
export async function seatNow(id: string) {
  const [list, tables] = await Promise.all([api.reservations.list(), api.tables.list()]);
  const r = list.find(x => x.id === id);
  if (!r || r.status !== 'booked') return;
  const t = tables.find(x => x.id === r.tableId);
  if (t && t.status === 'inactive') return seatAt(r, t.id);
  openSeatModal(r, t ? `${t.name} is in use right now.` : '');
}

export async function markNoShow(r: Reservation) {
  await api.reservations.noShow(r.id); await refresh(); closeModal(); toast(`${r.name} marked as no-show`);
}
export async function restoreRes(r: Reservation) {
  await api.reservations.restore(r.id); await refresh(); closeModal(); toast(`${r.name} is booked again`);
}
export async function moveToDay(r: Reservation, day: number) {
  if (await attempt(() => api.reservations.moveToDay(r.id, day))) {
    if (sod(r.at) !== day) { useResUi.getState().set({ day }); await refresh(); toast(`${r.name} moved to ${whenText(day + (r.at - sod(r.at)))}`); }
  }
}

/** Row actions for a reservation, opening the matching modal. */
export function resActions(r: Reservation): RowAction[] {
  const n = r.name;
  if (r.status === 'booked') return [
    { ic: 'qr', label: 'Seat now', aria: `Seat ${n}`, onClick: () => seatNow(r.id) },
    { ic: 'clock', label: 'Reschedule', aria: `Reschedule ${n}`, onClick: () => openMove(r) },
    { ic: 'edit', label: 'Edit', aria: `Edit ${n}`, onClick: () => openResForm(r) },
    { ic: 'user', label: 'Mark no-show', aria: `Mark ${n} as no-show`, onClick: () => markNoShow(r) },
    { ic: 'x', label: 'Cancel', aria: `Cancel ${n}`, onClick: () => openCancel(r), danger: true },
  ];
  if (r.status === 'arrived') return [{ ic: 'search', label: 'View', aria: `View ${n}`, onClick: () => openRes(r) }];
  return [{ ic: 'check', label: 'Restore', aria: `Restore ${n}`, onClick: () => restoreRes(r) }, { ic: 'search', label: 'View', aria: `View ${n}`, onClick: () => openRes(r) }];
}

export const openGuestView = (tableId: string) => { useUi.getState().set({ mode: 'guest' }); useUi.getState().setGuest({ table: tableId, tab: 'menu' }); closeModal(); scrollTo(0, 0); };
