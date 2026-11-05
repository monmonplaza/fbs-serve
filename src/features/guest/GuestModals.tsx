import { useState, type FormEvent } from 'react';
import { ItemNote } from '@/components/ItemNote';
import { api } from '@/api';
import { useFoods, useInvalidate, useOrders, usePayments, usePlate, useTables } from '@/api/queries';
import { TO } from '@/api/constants';
import { Icon } from '@/components/Icon';
import { itemName, orderEta, orderTag, plateItems, total } from '@/lib/domain';
import { peso, sum } from '@/lib/format';
import { closeModal } from '@/store/modal';
import { toast } from '@/store/toast';
import { useUi } from '@/store/ui';
import { useMyTakeouts } from './guestStore';

/** Confirm sending the shared table plate to the kitchen. */
export function SendModal({ tableId }: { tableId: string }) {
  const plate = usePlate(tableId).data, foods = useFoods().data, t = useTables().data.find(x => x.id === tableId);
  const invalidate = useInvalidate(), me = useUi(s => s.guest.name);
  const items = plateItems(plate, foods);
  const send = async () => {
    try {
      const o = await api.guest.send(tableId, me);
      useUi.getState().notify('plate', `${t?.name} sent a new order (${orderTag(o)})`, 'kitchen');
      useUi.getState().setGuest({ tab: 'orders' });
      await invalidate('plate', 'orders', 'tables');
      closeModal(); toast(`${orderTag(o)} sent to the kitchen`);
    } catch (e) { toast((e as Error).message); }
  };
  return (
    <>
      <div className="m-body">
        <p>You are sending the plate for everyone at {t?.name}. Only one guest sends it, so check with your table first.</p>
        <p><b>Estimated wait: about {orderEta(items, foods)} min</b></p>
        <ul className="items">
          {plate.map(l => { const f = foods.find(x => x.id === l.foodId); return f && <li key={l.id}><b className="num">{l.qty}×</b><span>{itemName(f, l.variantId)}</span><span className="caption muted">{l.by}</span></li>; })}
        </ul>
      </div>
      <div className="m-foot"><button className="btn btn-outline" onClick={closeModal}>Not yet</button><button className="btn btn-primary" onClick={send}>Send to kitchen</button></div>
    </>
  );
}

/** Pick how to pay and call the waiter. */
export function BillModal({ tableId }: { tableId: string }) {
  const payments = usePayments().data.filter(p => p.active), t = useTables().data.find(x => x.id === tableId);
  const orders = useOrders().data.filter(o => o.table === tableId && !!t?.token && o.session === t.token);
  const invalidate = useInvalidate();
  const [method, setMethod] = useState<string | null>(null);
  const sel = method ?? payments[0]?.id ?? '';
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api.guest.billOut(tableId, sel);
      useUi.getState().notify('bell', `${r.name} is asking for the bill`, 'tables');
      await invalidate('tables');
      closeModal(); toast('Your waiter has been called');
    } catch (err) { toast((err as Error).message); }
  };
  return (
    <form id="bill-form" onSubmit={submit}>
      <div className="m-body">
        <p>How would you like to pay? Your waiter will come to your table.</p>
        {payments.map(p => (
          <label key={p.id} className="radio-card">
            <input type="radio" name="method" value={p.id} checked={sel === p.id} onChange={() => setMethod(p.id)} />
            <span className="grow"><b>{p.name}</b><br /><span className="caption muted">{p.details}</span></span>
          </label>
        ))}
        <div className="sum"><div className="total"><span>Total</span><span className="num">{peso(sum(orders.map(total)))}</span></div></div>
      </div>
      <div className="m-foot"><button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button><button className="btn btn-primary"><Icon name="bell" size={20} />Call my waiter</button></div>
    </form>
  );
}

/** Place the Takeout-QR plate: name and phone, then the kitchen starts. */
export function TakeoutModal() {
  const plate = usePlate(TO).data, foods = useFoods().data, invalidate = useInvalidate();
  const items = plateItems(plate, foods);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget), name = String(fd.get('name')).trim();
    if (!name) return;
    try {
      const o = await api.guest.placeTakeout(name, String(fd.get('phone')).trim());
      useMyTakeouts.getState().add(o.id);
      useUi.getState().notify('bag', `New takeout ${o.pickup} from ${o.customer}`, 'kitchen');
      useUi.getState().setGuest({ tab: 'orders' });
      await invalidate('plate', 'orders');
      closeModal(); toast(`Order placed. Your pickup number is ${o.pickup}`);
    } catch (err) { toast((err as Error).message); }
  };
  return (
    <form id="to-form" onSubmit={submit}>
      <div className="m-body">
        <p>The kitchen starts cooking right away. <b>You pay at the counter when you pick it up.</b></p>
        <label className="field"><span>Your name</span><input id="tos-name" name="name" className="input" required autoComplete="name" maxLength={40} /><span className="hint">We call this name with your pickup number.</span></label>
        <label className="field"><span>Phone (optional)</span><input id="tos-phone" name="phone" className="input num" inputMode="tel" autoComplete="tel" maxLength={20} /></label>
        <p><b>Ready in about {orderEta(items, foods)} min</b></p>
        <ul className="items">{items.map((i, x) => <li key={x}><b className="num">{i.qty}×</b><span>{i.name}<ItemNote note={i.note} /></span><span className="num">{peso(i.price * i.qty)}</span></li>)}</ul>
        <div className="sum"><div className="total"><span>Pay at pickup</span><span className="num">{peso(sum(items.map(i => i.price * i.qty)))}</span></div></div>
      </div>
      <div className="m-foot"><button type="button" className="btn btn-outline" onClick={closeModal}>Not yet</button><button className="btn btn-primary"><Icon name="bag" size={20} />Place order</button></div>
    </form>
  );
}

