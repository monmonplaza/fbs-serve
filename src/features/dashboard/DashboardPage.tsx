import { orderTag } from '@/lib/domain';
import { useOrders, useTables } from '@/api/queries';
import { KITCHEN, TSTAT } from '@/api/constants';
import type { TableStatus } from '@/api/types';
import { aggregate, isTO, oMeta, total, sessionOrdersOf } from './helpers';
import { mins, peso, sameDay, sum } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';

export function DashboardPage() {
  const { data: orders } = useOrders();
  const { data: tables } = useTables();
  const go = useUi(s => s.go);
  const now = useNow();
  const today = orders.filter(o => sameDay(o.createdAt, now));
  const paid = today.filter(o => o.status === 'paid');
  const pending = sum(tables.flatMap(sessionOrdersOf(orders)).concat(orders.filter(isTO)).filter(o => o.status !== 'paid').map(total));
  const inUse = tables.filter(t => t.status !== 'inactive').length;
  const top = aggregate(today).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const max = top[0]?.qty || 1;
  const kq = orders.filter(o => KITCHEN.includes(o.status)).sort((a, b) => a.createdAt - b.createdAt);
  const counts = (Object.keys(TSTAT) as TableStatus[]).map(k => [k, tables.filter(t => t.status === k).length] as const);
  const where = (o: (typeof orders)[number]) => (isTO(o) ? `Takeout ${o.pickup}` : tables.find(t => t.id === o.table)?.name ?? '');

  return (
    <>
      <div className="page-head"><div><h1>Dashboard</h1><p className="muted">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div></div>
      <div className="tiles">
        <div className="card tile"><Icon name="cash" /><span className="label muted">Income today</span><span className="val num">{peso(sum(paid.map(total)))}</span><span className="caption muted num">{peso(pending)} still to collect</span></div>
        <div className="card tile"><Icon name="receipt" /><span className="label muted">Orders today</span><span className="val num">{today.length}</span><span className="caption muted">{paid.length} paid · {today.length - paid.length} open · {today.filter(isTO).length} takeout</span></div>
        <div className="card tile"><Icon name="table" /><span className="label muted">Active tables</span><span className="val num">{inUse}</span><span className="caption muted">of {tables.length} tables</span></div>
        <div className="card tile"><Icon name="moon" /><span className="label muted">Inactive tables</span><span className="val num">{tables.length - inUse}</span><span className="caption muted">Ready for new guests</span></div>
      </div>
      <div className="two">
        <section className="card">
          <div className="card-head"><h3>Top ordered today</h3><span className="caption muted">by quantity</span></div>
          {top.length ? (
            <ol className="bars">{top.map((f, i) => (
              <li className="bar-row" key={f.name}><span className="rank num">{i + 1}</span><span>{f.name}</span><span className="num label">{f.qty} sold</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(f.qty / max) * 100}%` }} /></div></li>
            ))}</ol>
          ) : <div className="empty">No orders yet today.</div>}
        </section>
        <section className="card">
          <div className="card-head"><h3>In the kitchen now</h3><button className="btn btn-outline" onClick={() => go('kitchen')}>Open kitchen</button></div>
          {kq.length ? (
            <ul className="rows">{kq.slice(0, 6).map(o => (
              <li key={o.id}><div className="grow"><b className="num">{orderTag(o)}</b> <span className="muted">· {where(o)}</span><div className="caption muted num">{mins(o.createdAt)} min ago</div></div><Pill meta={oMeta(o)} withIcon={false} /></li>
            ))}</ul>
          ) : <div className="empty">The kitchen is clear.</div>}
        </section>
      </div>
      <section className="card">
        <div className="card-head"><h3>Tables at a glance</h3><button className="btn btn-outline" onClick={() => go('tables')}>Open floor plan</button></div>
        <div className="statgrid">{counts.map(([k, n]) => <div className="stat" key={k}><Pill meta={TSTAT[k]} /><b className="num">{n}</b></div>)}</div>
      </section>
    </>
  );
}
