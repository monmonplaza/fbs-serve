import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { usePaged } from '@/components/Pager';
import { useOrders } from '@/api/queries';
import type { DiningTable, Order, OrderStatus } from '@/api/types';
import { openModal } from '@/store/modal';
import { billKey, isTO, total } from '@/lib/domain';
import { peso, sum } from '@/lib/format';
import { ChTag, chanOf, isPlatform, sod, usePayName, useTableName } from './helpers';
import { FLOW, blankAll, buildCols, cfMatch, cfOn, inRange, type ColValue } from './columns';
import { ColFilter } from './ColFilter';
import { OrdersTable, type Group } from './OrdersTable';
import { PayTableModal, openOrder, openPickup } from './PayModals';
import { openTakeoutCounter, openTakeoutQr } from './TakeoutModals';

/** Opens the payment modal for every unpaid order of a table's session (used by the "asking for the bill" banner). */
export function openPayTable(table: DiningTable) {
  openModal({ title: `Receive payment · ${table.name}`, content: <PayTableModal tableId={table.id} /> });
}

const RANGES = [['today', 'Today'], ['week', 'This week'], ['month', 'This month']] as const;
const TYPES = [['all', 'All'], ['dinein', 'Dine-in'], ['takeout', 'Takeout']] as const;

// Dine-in orders from one table session are one bill: the first order and its additional orders share a row and are paid together.
function groupRows(list: Order[]): Group[] {
  const map = new Map<string, Group>(), out: Group[] = [];
  [...list].sort((a, b) => a.createdAt - b.createdAt).forEach(o => {
    const k = billKey(o, sod);
    if (!k) { out.push({ k: o.id, main: o, kids: [], all: [o] }); return; }
    let g = map.get(k);
    if (!g) { g = { k, main: o, kids: [], all: [o] }; map.set(k, g); out.push(g); } else { g.kids.push(o); g.all.push(o); }
  });
  return out.sort((a, b) => b.main.createdAt - a.main.createdAt);
}

export function OrdersPage() {
  const orders = useOrders().data;
  const payName = usePayName(), tName = useTableName();
  const [range, setRange] = useState('today');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const cols = useMemo(() => buildCols(tName, payName), [tName, payName]);
  const [colF, setColF] = useState<Record<string, ColValue>>(() => blankAll(buildCols(() => '', () => '')));
  const [pop, setPop] = useState<string | null>(null);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  const Q = q.trim().toUpperCase();
  // Orders after the date range, type chips and search; the column filters narrow this further.
  const base = orders
    .filter(o => (Q ? o.id.includes(Q) : inRange(o.createdAt, range)) && (type === 'all' || (type === 'takeout') === isTO(o)))
    .sort((a, b) => b.createdAt - a.createdAt);
  const list = base.filter(cfMatch(cols, colF));
  const nOn = cols.filter(c => cfOn(c, colF)).length;
  const ready = orders.filter(o => isTO(o) && o.status === 'ready').sort((a, b) => a.createdAt - b.createdAt);
  const groups = groupRows(list);
  const pg = usePaged(groups, `${range}|${type}|${Q}|${JSON.stringify(colF)}`);

  const popCol = cols.find(c => c.k === pop);
  const counts = new Map<string, number>();
  if (popCol) base.forEach(o => { const x = String(popCol.v(o)); counts.set(x, (counts.get(x) || 0) + 1); });

  const groupStatus = (g: Group): OrderStatus => {
    const live = g.all.filter(o => o.status !== 'paid');
    return live.length ? live.reduce((m, o) => (FLOW.indexOf(o.status) < FLOW.indexOf(m.status) ? o : m)).status : 'paid';
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Orders</h1><p className="muted">Every dine-in and takeout order, in any status.</p></div>
        <button className="btn btn-outline" onClick={openTakeoutQr}><Icon name="qr" size={20} />Takeout QR</button>
        <button className="btn btn-primary" onClick={openTakeoutCounter}><Icon name="bag" size={20} />New takeout order</button>
      </div>
      {ready.length > 0 && (
        <section className="card">
          <div className="card-head"><h3>Ready for pickup</h3><span className="badge num">{ready.length}</span></div>
          <ul className="rows">
            {ready.map(o => (
              <li key={o.id}>
                <div className="grow">
                  <b className="num">{o.pickup}</b> <ChTag o={o} /> <span className="muted">· {o.customer}{o.phone ? <> · <span className="num">{o.phone}</span></> : null}</span>
                  <div className="caption muted num">{o.id} · {sum(o.items.map(i => i.qty))} items · {isPlatform(o) ? `paid in the ${chanOf(o).l} app${o.ref ? ' · ' + o.ref : ''}` : 'pay on pickup'}</div>
                </div>
                <b className="num">{peso(total(o))}</b>
                <button className="btn btn-primary" onClick={() => openPickup(o)}><Icon name={isPlatform(o) ? 'bag' : 'wallet'} size={20} />{isPlatform(o) ? 'Hand to rider' : 'Collect payment'}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Date range">
          {RANGES.map(([k, l]) => <button key={k} className="chip" aria-pressed={range === k && !Q} onClick={() => { setRange(k); setQ(''); }}>{l}</button>)}
        </div>
        <div className="chips" role="group" aria-label="Order type">
          {TYPES.map(([k, l]) => <button key={k} className="chip" aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>)}
        </div>
        <div className="spacer" />
        {nOn > 0 && <button className="btn btn-outline" onClick={() => { setColF(blankAll(cols)); setPop(null); }}><Icon name="x" size={18} />Clear filters ({nOn})</button>}
        <label className="search"><span className="sr" hidden>Search order ID</span><Icon name="search" />
          <input id="order-q" className="input" placeholder="Search order ID, e.g. 1042" value={q} onChange={e => setQ(e.target.value)} aria-label="Search order ID" />
        </label>
      </div>
      {Q && <p className="caption canvas-note">Searching all dates for “{q}”. Clear the search to use the date filter.</p>}
      <div className="tbl-scroll">
        <table className="data">
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c.k} className={c.r ? 'r' : ''}>
                  <div className="th-f">
                    <span>{c.l}</span>
                    <button className={`th-btn ${cfOn(c, colF) ? 'on' : ''}`} data-col-filter={c.k} aria-haspopup="dialog" aria-label={`Filter ${c.l}${cfOn(c, colF) ? ', filter on' : ''}`}
                      onClick={() => setPop(pop === c.k ? null : c.k)}><Icon name="filter" size={16} /></button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <OrdersTable groups={pg.rows} open={openRows} groupStatus={groupStatus}
              onToggle={k => setOpenRows(s => ({ ...s, [k]: !s[k] }))}
              onOpen={o => openOrder(o, orders.filter(x => { const k = billKey(o, sod); return k ? billKey(x, sod) === k : x.id === o.id; }).sort((a, b) => a.createdAt - b.createdAt))}
              onOpenOne={o => openOrder(o, [o], true)} />
            {!pg.rows.length && (
              <tr><td colSpan={7}><div className="empty"><Icon name="search" size={32} />No orders match. Check the filters or pick another date range.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {pg.bar}
      <p className="caption canvas-note num">{list.length} orders · {peso(sum(list.map(total)))}</p>
      {popCol && (
        <ColFilter col={popCol} value={colF[popCol.k]} counts={counts}
          onChange={v => setColF(f => ({ ...f, [popCol.k]: v }))}
          onClose={refocus => { setPop(null); if (refocus) document.querySelector<HTMLElement>(`[data-col-filter="${popCol.k}"]`)?.focus(); }} />
      )}
    </>
  );
}
