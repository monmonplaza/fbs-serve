import type { DiningTable, Order } from '@/api/types';
import { KITCHEN } from '@/api/constants';
import { usePayments } from '@/api/queries';
import { Icon } from '@/components/Icon';
import { aggregate, total } from '@/lib/domain';
import { peso, sum } from '@/lib/format';
import { openModal } from '@/store/modal';
import { BillModal } from './GuestModals';

export function GuestClosed({ t }: { t: DiningTable }) {
  if (t.status === 'cleaning') return <div className="center"><div className="big-ic"><Icon name="check" size={32} /></div><h3>Payment received</h3><p className="muted">Thank you for dining at FBS Serve. This table QR is now closed.</p></div>;
  return <div className="center"><div className="big-ic"><Icon name="qr" size={32} /></div><h3>{t.name} is not active yet</h3><p className="muted">Ask your waiter to activate this table. Then scan the QR code they show you.</p></div>;
}

export function GuestBill({ t, orders }: { t: DiningTable; orders: Order[] }) {
  const payments = usePayments().data, tot = sum(orders.map(total));
  if (t.status === 'billout') {
    const id = t.bill?.method ?? '';
    const method = payments.find(p => p.id === id);
    const name = id === 'split' ? 'Split bill' : method?.name || id;
    return (
      <div className="center">
        <div className="big-ic"><Icon name="bell" size={32} /></div>
        <h3>Your waiter is on the way</h3>
        <p className="muted">You chose {name}. Total <b className="num">{peso(tot)}</b>.</p>
        <p className="caption muted">Discounts like senior citizen or PWD are applied by the waiter. Have your ID ready.</p>
      </div>
    );
  }
  if (!orders.length) return <div className="center"><div className="big-ic"><Icon name="wallet" size={32} /></div><h3>Nothing to pay yet</h3><p className="muted">Your bill appears here after you order.</p></div>;
  const waiting = orders.some(o => KITCHEN.includes(o.status));
  return (
    <>
      <h3>Your bill</h3>
      <div className="card" style={{ padding: 16 }}>
        <ul className="items">
          {aggregate(orders).map(i => <li key={i.name}><b className="num">{i.qty}×</b><span>{i.name}</span><span className="num">{peso(i.qty * i.price)}</span></li>)}
        </ul>
        <div className="sum" style={{ marginTop: 12 }}><div className="total"><span>Total</span><span className="num">{peso(tot)}</span></div></div>
      </div>
      {waiting && <div className="alert warn"><Icon name="alert" /><p className="caption">You can ask for the bill once all your food is served.</p></div>}
      <button className="btn btn-primary block" disabled={waiting} onClick={() => openModal({ title: 'Bill out', content: <BillModal tableId={t.id} /> })}><Icon name="bell" size={20} />Bill out</button>
    </>
  );
}
