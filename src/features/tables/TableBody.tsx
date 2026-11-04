import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { api } from '@/api';
import { useOrders, usePayments, useInvalidate, useSettings } from '@/api/queries';
import { OSTAT, TSTAT } from '@/api/constants';
import type { DiningTable, Reservation } from '@/api/types';
import { aggregate, total } from '@/lib/domain';
import { mins, peso, sum, tm } from '@/lib/format';
import { toast } from '@/store/toast';
import { openPayTable } from '@/features/orders/OrdersPage';
import { openSeatReservation } from '@/features/reservations/ReservationsPage';
import { openQr, openGuestView } from './QrModal';
import { openActivate } from './ActivateModal';

export const SHOW_BEFORE = 60;
export const SHOW_AFTER = 30;
/** A table shows as Reserved from SHOW_BEFORE minutes before its booking until SHOW_AFTER minutes after it. */
export const tableRes = (t: DiningTable, list: Reservation[], now = Date.now()) =>
  list.filter(r => r.tableId === t.id && r.status === 'booked' && now >= r.at - SHOW_BEFORE * 60000 && now <= r.at + SHOW_AFTER * 60000).sort((a, b) => a.at - b.at)[0];

/** The stay timer: counts from the moment the table was activated, until it is cleaned. */
export const tableOverLimit = (t: DiningTable, s?: { tableTimerOn: boolean; tableTimerMins: number }) =>
  !!(s?.tableTimerOn && t.openedAt && !['inactive', 'cleaning'].includes(t.status) && mins(t.openedAt) >= s.tableTimerMins);

export function TableBody({ t, rv }: { t: DiningTable; rv?: Reservation }) {
  const invalidate = useInvalidate();
  const orders = useOrders().data, payments = usePayments().data, settings = useSettings();
  const os = t.token ? orders.filter(o => o.table === t.id && o.session === t.token) : [];
  const items = aggregate(os.filter(o => o.status !== 'paid' || t.status === 'cleaning'));
  const ready = os.filter(o => o.status === 'completed');
  const over = tableOverLimit(t, settings);
  const payName = (id: string) => payments.find(p => p.id === id)?.name || id;

  const serve = async (id: string) => {
    await api.tables.serveOrder(id);
    await invalidate('orders', 'tables');
    toast(`${id} served to ${t.name}`);
  };
  const clean = async () => {
    await api.tables.clean(t.id);
    await invalidate('tables', 'plate');
    toast(`${t.name} is ready for new guests. The old QR no longer works.`);
  };

  return (
    <>
      {over ? (
        <div className="alert err"><span className="ic"><Icon name="clock" size={18} /></span>
          <p><b>Over the stay time limit</b><br /><span className="caption">Seated for {mins(t.openedAt!)} min, past the {settings?.tableTimerMins} min limit.</span></p></div>
      ) : null}
      <dl className="kv">
        <dt>Status</dt><dd><Pill meta={TSTAT[t.status]} /></dd>
        <dt>Seats</dt><dd>{t.seats}</dd>
        {rv ? <><dt>Reserved</dt><dd className="num">{tm(rv.at)} · {rv.name} · {rv.pax} guests{rv.order?.length ? ' · advance order' : ''}</dd></> : null}
        {t.guests ? <><dt>Guests</dt><dd className="num">{t.guests}</dd></> : null}
        {t.openedAt ? <><dt>Seated</dt><dd className="num">{tm(t.openedAt)} ({mins(t.openedAt)} min)</dd></> : null}
        {os.length ? <><dt>Orders</dt><dd className="num">{os.map((o, i) => <span key={o.id}>{i ? <br /> : null}{o.id} at {tm(o.createdAt)} · {OSTAT[o.status]?.l}</span>)}</dd></> : null}
        {t.bill ? <><dt>Pays with</dt><dd>{payName(t.bill.method)}</dd></> : null}
      </dl>
      {items.length ? (
        <>
          <ul className="items">{items.map((i, k) => <li key={k}><b className="num">{i.qty}×</b><span>{i.name}</span><span className="num">{peso(i.qty * i.price)}</span></li>)}</ul>
          <div className="sum"><div className="total"><span>Total</span><span className="num">{peso(sum(os.map(total)))}</span></div></div>
        </>
      ) : <p className="caption muted">{t.status === 'inactive' ? 'No guests. When guests sit here, tap Activate table to show their QR code.' : 'No orders yet.'}</p>}
      <div className="pop-actions">
        {rv && t.status === 'inactive' ? <button className="btn btn-primary" onClick={() => openSeatReservation(rv.id)}><Icon name="calendar" size={20} />Seat {rv.name}</button> : null}
        {t.status === 'inactive' ? <button className={`btn ${rv ? 'btn-outline' : 'btn-primary'}`} onClick={() => openActivate(t)}><Icon name="qr" size={20} />Activate table</button> : null}
        {['active', 'ordering', 'eating'].includes(t.status) ? <button className="btn btn-outline" onClick={() => openQr(t)}><Icon name="qr" size={20} />Show QR</button> : null}
        {ready.map(o => <button key={o.id} className="btn btn-secondary" onClick={() => serve(o.id)}><Icon name="check" size={20} />Serve {o.id}</button>)}
        {t.status === 'billout' ? <button className="btn btn-primary" onClick={() => openPayTable(t)}><Icon name="wallet" size={20} />Receive payment</button> : null}
        {t.status === 'cleaning' ? <button className="btn btn-primary" onClick={clean}><Icon name="sparkle" size={20} />Mark as clean</button> : null}
        {t.token && t.status !== 'cleaning' ? <button className="btn btn-ghost" onClick={() => openGuestView(t.id)}><Icon name="phone" size={20} />Guest view</button> : null}
      </div>
    </>
  );
}
