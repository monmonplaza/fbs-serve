import type { Order } from '@/api/types';
import { ItemNote } from '@/components/ItemNote';
import { GSTEPS, GSTEP_L, OSTAT, TO_STEPS, TO_STEP_L } from '@/api/constants';
import { Icon } from '@/components/Icon';
import { useNow } from '@/lib/useNow';
import { mins, peso, tm } from '@/lib/format';
import { oMeta, orderEta, total } from '@/lib/domain';

function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="center"><div className="big-ic"><Icon name={icon} size={32} /></div><h3>{title}</h3><p className="muted">{text}</p></div>;
}

function Track({ o, takeout }: { o: Order; takeout: boolean }) {
  const steps = takeout ? TO_STEPS : GSTEPS, labels = takeout ? TO_STEP_L : GSTEP_L;
  const k = steps.indexOf(o.status), m = takeout ? oMeta(o) : OSTAT[o.status]!;
  const done = takeout ? o.status === 'paid' : o.status === 'served';
  const left = (o.eta || orderEta(o.items, [])) - mins(o.createdAt);
  return (
    <section className="card track" style={{ padding: 16 }}>
      <span className="caption muted num">{o.id} · {tm(o.createdAt)} · {takeout ? o.customer : `sent by ${o.by}`}</span>
      {takeout && <div className="pickup"><span className="caption muted">Pickup number</span><b className="num">{o.pickup}</b></div>}
      <h3>{m.g}</h3>
      <p className="caption muted">{m.d}</p>
      {['queued', 'cooking', 'plating'].includes(o.status) && (
        <span className="pill p-info" style={{ alignSelf: 'flex-start' }}><Icon name="clock" size={16} />{left > 0 ? `Ready in about ${left} min` : 'Almost ready'}</span>
      )}
      <div className="prog" style={{ gridTemplateColumns: `repeat(${steps.length},1fr)` }} aria-hidden="true">
        {steps.map((s, i) => <i key={s} className={i <= k ? 'on' : ''} />)}
      </div>
      <ol className="steps">
        {labels.map((l, i) => {
          const dn = i < k || done;
          return <li key={l} className={dn ? 'done' : i === k ? 'now' : ''}><span className="dot">{dn ? <Icon name="check" /> : null}</span>{l}</li>;
        })}
      </ol>
      <ul className="items">
        {o.items.map((i, x) => <li key={x}><b className="num">{i.qty}×</b><span>{i.name}<ItemNote note={i.note} /></span><span className="num">{peso(i.qty * i.price)}</span></li>)}
      </ul>
      {takeout && <div className="sum"><div className="total"><span>{done ? 'Paid' : 'Pay at pickup'}</span><span className="num">{peso(total(o))}</span></div></div>}
    </section>
  );
}

/** Orders the table's session has sent (dine-in), or the takeout orders this phone placed. */
export function GuestOrders({ orders, takeout }: { orders: Order[]; takeout: boolean }) {
  useNow(30000);
  const os = [...orders].sort((a, b) => b.createdAt - a.createdAt);
  if (!os.length) return takeout
    ? <Empty icon="clock" title="No takeout orders yet" text="Place an order from your plate. You can follow it here." />
    : <Empty icon="clock" title="No orders yet" text="Send your plate to the kitchen to start an order." />;
  return <>{os.map(o => <Track key={o.id} o={o} takeout={takeout} />)}</>;
}
