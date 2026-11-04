import { api } from '@/api';
import { ItemNote } from '@/components/ItemNote';
import { ApiError } from '@/api';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { useInvalidate, useOrders, usePayments, useTables } from '@/api/queries';
import type { Order, OrderItem, Payment, PaymentMethod } from '@/api/types';
import { useUi } from '@/store/ui';
import { closeModal, openModal } from '@/store/modal';
import { toast } from '@/store/toast';
import { aggregate, billKey, isTO, oMeta, subtotal, total } from '@/lib/domain';
import { dt, peso, sum, tm } from '@/lib/format';
import { ChTag, chanOf, isPlatform, sod, usePayName, useTableName } from './helpers';
import { PayForm } from './PayForm';

const useMethods = (activeOnly: boolean): PaymentMethod[] => {
  const all = usePayments().data;
  if (!activeOnly) return all;
  const a = all.filter(x => x.active);
  return a.length ? a : all;
};
const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

function Items({ items }: { items: (Pick<OrderItem, 'name' | 'price' | 'qty'> & { note?: string })[] }) {
  return (
    <ul className="items">
      {items.map((i, k) => <li key={k}><b className="num">{i.qty}×</b><span>{i.name}<ItemNote note={i.note} /></span><span className="num">{peso(i.qty * i.price)}</span></li>)}
    </ul>
  );
}

/** All orders of one table session (the bill), oldest first. */
export function useBill(orderId: string) {
  const orders = useOrders().data;
  const o = orders.find(x => x.id === orderId);
  if (!o) return { o: undefined, grp: [] as Order[] };
  const k = billKey(o, sod);
  return { o, grp: k ? orders.filter(x => billKey(x, sod) === k).sort((a, b) => a.createdAt - b.createdAt) : [o] };
}

export const openPickup = (o: Order) =>
  openModal(isPlatform(o)
    ? { title: `Hand to rider · ${o.pickup}`, content: <HandoverModal id={o.id} /> }
    : { title: `Collect payment · ${o.pickup}`, content: <PickupModal id={o.id} /> });

const isPayable = (o: Order, grp: Order[]) =>
  !isTO(o) && grp.some(x => x.status === 'served') && grp.every(x => ['served', 'paid'].includes(x.status)) && grp.some(x => x.status !== 'paid');

/** Opens an order. `grp` is its whole bill (omit or pass [o] with solo for a single order). */
export function openOrder(o: Order, grp: Order[] = [o], solo = false) {
  const g = solo ? [o] : grp;
  openModal({ title: !solo && isPayable(o, g) && g.length > 1 ? `${o.id} and ${g.length - 1} additional` : o.id, content: <OrderModal id={o.id} solo={solo} /> });
}

/** Receive payment for a whole table (the "asking for the bill" banner). */
export function PayTableModal({ tableId }: { tableId: string }) {
  const t = useTables().data.find(x => x.id === tableId);
  const orders = useOrders().data;
  const methods = useMethods(false);
  const payName = usePayName();
  const invalidate = useInvalidate();
  if (!t) return null;
  const os = t.token ? orders.filter(o => o.table === t.id && o.session === t.token && o.status !== 'paid') : [];
  return (
    <PayForm
      orders={os} methods={methods} defaultMethod={t.bill?.method} hint={`Guest chose ${payName(t.bill?.method)}.`}
      before={<ul className="items">{aggregate(os).map(i => <li key={i.name}><b className="num">{i.qty}×</b><span>{i.name}</span><span className="num">{peso(i.qty * i.price)}</span></li>)}</ul>}
      cancelLabel="Cancel" submitLabel="Payment received"
      onSubmit={async (disc, pays) => {
        try {
          await api.orders.payTable(t.id, disc, pays);
          useUi.getState().notify('check', `${t.name} paid. Ready for cleanup`, 'tables');
          closeModal(); await invalidate('orders', 'tables');
          toast(`${t.name} paid. Clean the table, then mark it clean.`);
        } catch (e) { fail(e); }
      }}
    />
  );
}

/** A takeout order paid on pickup. */
export function PickupModal({ id }: { id: string }) {
  const o = useOrders().data.find(x => x.id === id);
  const methods = usePayments().data.filter(p => p.active);
  const invalidate = useInvalidate();
  if (!o) return null;
  return (
    <PayForm
      orders={[o]} methods={methods}
      before={<>
        <p><b>{o.customer}</b>{o.phone ? <> · <span className="num">{o.phone}</span></> : null}<br /><span className="caption muted num">{o.id} · takeout, paid on pickup</span></p>
        <Items items={o.items} />
      </>}
      cancelLabel="Cancel" submitLabel="Paid and picked up"
      onSubmit={async (disc, pays: Payment[]) => {
        try {
          await api.orders.payPickup(o.id, disc, pays);
          closeModal(); await invalidate('orders');
          toast(`${o.pickup} paid and picked up`);
        } catch (e) { fail(e); }
      }}
    />
  );
}

/** GrabFood and Foodpanda orders are paid in the app, so the counter only hands the order to the rider. */
export function HandoverModal({ id }: { id: string }) {
  const o = useOrders().data.find(x => x.id === id);
  const invalidate = useInvalidate();
  if (!o) return null;
  const c = chanOf(o);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.orders.handover(o.id);
      closeModal(); await invalidate('orders');
      toast(`${o.pickup} handed to the ${c.l} rider`);
    } catch (err) { fail(err); }
  };
  return (
    <form id="hand-form" onSubmit={submit}>
      <div className="m-body">
        <p><ChTag o={o} /><br /><b>{o.customer}</b>{o.ref ? <> · <span className="num">{o.ref}</span></> : null}<br /><span className="caption muted num">{o.id}</span></p>
        <Items items={o.items} />
        <div className="alert info"><Icon name="wallet" /><p><b>Already paid in the {c.l} app.</b><br /><span className="caption">Give the order to the rider. Do not collect payment.</span></p></div>
        <div className="sum"><div className="total"><span>Order total</span><span className="num">{peso(subtotal(o))}</span></div></div>
      </div>
      <div className="m-foot">
        <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary"><Icon name="check" size={20} />Handed to rider</button>
      </div>
    </form>
  );
}

/** One order or a whole table bill. A served dine-in bill can be paid right here. */
export function OrderModal({ id, solo = false }: { id: string; solo?: boolean }) {
  const { o, grp: bill } = useBill(id);
  const tables = useTables().data;
  const methods = useMethods(true);
  const payName = usePayName(), tName = useTableName();
  const invalidate = useInvalidate();
  if (!o) return null;
  const grp = solo ? [o] : bill, many = grp.length > 1;
  const payable = !solo && isPayable(o, grp);
  const t = tables.find(x => x.id === o.table);
  const unpaid = grp.filter(x => x.status !== 'paid');
  const breakdown = o.payments && o.payments.length > 1 ? o.payments : null;

  const details = (
    <>
      <dl className="kv">
        <dt>Status</dt><dd><Pill meta={oMeta(o)} /></dd>
        {isTO(o) ? (
          <>
            <dt>Order from</dt><dd><ChTag o={o} /></dd>
            {o.ref ? <><dt>{chanOf(o).l} order no.</dt><dd className="num">{o.ref}</dd></> : null}
            <dt>Type</dt><dd>Takeout, {isPlatform(o) ? 'entered by staff' : o.source === 'qr' ? 'from the Takeout QR' : 'at the counter'}</dd>
            <dt>Pickup number</dt><dd className="num">{o.pickup}</dd>
            <dt>Customer</dt><dd>{o.customer}{o.phone ? <> · <span className="num">{o.phone}</span></> : null}</dd>
          </>
        ) : <><dt>Table</dt><dd>{tName(o.table)}</dd></>}
        <dt>Ordered</dt><dd className="num">{dt(o.createdAt)}, {tm(o.createdAt)}</dd>
        {isTO(o) ? null : <><dt>Sent by</dt><dd>{o.by}</dd></>}
        {o.payment ? (
          <>
            <dt>Payment</dt>
            <dd>{payName(o.payment)}{breakdown ? <><br /><span className="caption muted num">{breakdown.map((p, i) => <span key={i}>{i ? <br /> : null}{payName(p.method)} {peso(p.amount)}</span>)}</span></> : null}</dd>
          </>
        ) : null}
        {o.discount ? <><dt>Discount</dt><dd>{o.discount.name} ({o.discount.pct}%)</dd></> : null}
      </dl>
      {many
        ? grp.map((x, i) => (
          <div key={x.id}>
            <p className="caption muted num" style={{ margin: '8px 0 2px' }}>{x.id} · {i ? 'Additional order' : 'First order'} · {oMeta(x).l}</p>
            <Items items={x.items} />
          </div>
        ))
        : <Items items={o.items} />}
      {many && !payable && !solo && !isTO(o) && grp.some(x => x.status !== 'paid') ? <p className="caption muted">One bill for the whole table. Payment opens once every order is served.</p> : null}
    </>
  );

  if (payable) {
    return (
      <PayForm
        orders={unpaid} methods={methods} defaultMethod={t?.bill?.method}
        hint={t?.bill ? `Guest chose ${payName(t.bill.method)}.` : undefined}
        before={details} cancelLabel="Close" submitLabel="Payment received"
        onSubmit={async (disc, pays) => {
          try {
            const r = await api.orders.payBill(o.id, disc, pays);
            const split = pays.length > 1;
            closeModal(); await invalidate('orders', 'tables');
            const cleaning = r.table?.status === 'cleaning';
            toast(`${r.count > 1 ? `${r.count} orders` : o.id} paid${split ? ' with a split bill' : ' with ' + payName(pays[0].method)}${cleaning ? `. ${r.table!.name} is ready to clean.` : ''}`);
          } catch (e) { fail(e); }
        }}
      />
    );
  }
  const sub = sum(grp.map(subtotal)), tot = sum(grp.map(total));
  return (
    <>
      <div className="m-body">
        {details}
        <div className="sum">
          <div><span className="muted">Subtotal</span><span className="num">{peso(sub)}</span></div>
          {o.discount ? <div><span className="muted">Discount</span><span className="num">−{peso(sub - tot)}</span></div> : null}
          <div className="total"><span>Total</span><span className="num">{peso(tot)}</span></div>
        </div>
      </div>
      <div className="m-foot">
        <button className="btn btn-outline" onClick={closeModal}>Close</button>
        {isTO(o) && o.status === 'ready' ? (
          <button className="btn btn-primary" onClick={() => openPickup(o)}><Icon name={isPlatform(o) ? 'bag' : 'wallet'} size={20} />{isPlatform(o) ? 'Hand to rider' : 'Collect payment'}</button>
        ) : null}
      </div>
    </>
  );
}
