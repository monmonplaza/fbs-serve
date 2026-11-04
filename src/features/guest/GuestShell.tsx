import { useEffect, useState } from 'react';
import { api } from '@/api';
import { useFoods, useInvalidate, useOrders, usePlate, useTables } from '@/api/queries';
import { TO, TSTAT } from '@/api/constants';
import type { Food } from '@/api/types';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { LOGO } from '@/app/TopBar';
import { peso, sum } from '@/lib/format';
import { openModal } from '@/store/modal';
import { toast } from '@/store/toast';
import { useUi } from '@/store/ui';
import { unitPrice } from '@/lib/domain';
import { GuestMenu } from './GuestMenu';
import { GuestPlate } from './GuestPlate';
import { GuestOrders } from './GuestOrders';
import { GuestBill, GuestClosed } from './GuestBill';
import { PickSheet } from './PickSheet';
import { SendModal, TakeoutModal } from './GuestModals';
import { useMyTakeouts } from './guestStore';

type Tab = 'menu' | 'plate' | 'orders' | 'bill';

/** One phone for both QR codes: a table (menu, plate, orders, bill) or Takeout (no bill, paid at the counter). */
function Phone({ tableId }: { tableId: string }) {
  const takeout = tableId === TO;
  const tables = useTables().data, foods = useFoods().data, orders = useOrders().data;
  const plate = usePlate(tableId).data, invalidate = useInvalidate();
  const { name, tab: gtab } = useUi(s => s.guest), setGuest = useUi(s => s.setGuest);
  const mine = useMyTakeouts(s => s.ids);
  const [pick, setPick] = useState<Food | null>(null);
  const t = takeout ? null : tables.find(x => x.id === tableId);
  const tab: Tab = takeout && gtab === 'bill' ? 'menu' : gtab;
  const n = sum(plate.map(l => l.qty));
  const lineTotal = sum(plate.map(l => { const f = foods.find(x => x.id === l.foodId); return f ? unitPrice(f, l.variantId) * l.qty : 0; }));

  const add = async (f: Food, vid?: string) => {
    try {
      const r = await api.guest.addLine(tableId, f.id, vid, name);
      await invalidate('plate');
      toast(`${r.name} added to plate`);
    } catch (e) { toast((e as Error).message); }
  };
  const onAdd = (f: Food) => { if (f.variants?.length) setPick(f); else add(f); };

  if (!takeout && !t) return null;
  const live = takeout || (!!t?.token && !['inactive', 'cleaning'].includes(t.status));
  const sessionOrders = t ? orders.filter(o => o.table === t.id && !!t.token && o.session === t.token) : [];
  const tabs: [Tab, string, string][] = [['menu', 'Menu', 'utensils'], ['plate', 'Plate', 'plate'], ['orders', 'Orders', 'clock'], ['bill', 'Bill', 'wallet']];
  const shown = takeout ? tabs.slice(0, 3) : tabs;
  const body = tab === 'menu' ? <GuestMenu onAdd={onAdd} />
    : tab === 'plate' ? <GuestPlate plate={plate} tableId={tableId} tableName={t?.name} />
    : tab === 'orders' ? <GuestOrders takeout={takeout} orders={takeout ? orders.filter(o => mine.includes(o.id)) : sessionOrders} />
    : t ? <GuestBill t={t} orders={sessionOrders} /> : null;
  const send = () => openModal({ title: 'Send plate to kitchen?', content: <SendModal tableId={tableId} /> });
  const placeTo = () => openModal({ title: 'Place takeout order?', content: <TakeoutModal /> });

  return (
    <div className="phone" aria-label={takeout ? 'Takeout phone preview' : 'Guest phone preview'}>
      <div className="g-top">
        {LOGO}
        <div className="grow"><b>FBS Serve</b><div className="caption muted">{takeout ? 'Takeout · pay when you pick up' : `${t!.name} · ${name}`}</div></div>
        {takeout ? <span className="pill p-brand"><Icon name="bag" size={16} />Takeout</span> : live ? <Pill meta={TSTAT[t!.status]} /> : null}
      </div>
      {!live ? <div className="g-scroll"><GuestClosed t={t!} /></div> : (
        <>
          <div className="g-scroll">{body}</div>
          {tab === 'plate' && n > 0 && (
            <div className="g-foot">
              <button className="btn btn-primary block" onClick={takeout ? placeTo : send}>{takeout ? 'Place takeout order' : 'Send to kitchen'} · {peso(lineTotal)}</button>
            </div>
          )}
          <nav className={`g-tabs${takeout ? ' three' : ''}`} aria-label={takeout ? 'Takeout menu' : 'Guest menu'}>
            {shown.map(([k, l, ic]) => (
              <button key={k} className="g-tab" aria-current={tab === k ? 'page' : undefined} onClick={() => setGuest({ tab: k })}>
                <Icon name={ic} />{l}{k === 'plate' && n > 0 && <span className="badge num">{n}</span>}
              </button>
            ))}
          </nav>
        </>
      )}
      {pick && <PickSheet food={pick} onClose={() => setPick(null)} onAdd={vid => { add(pick, vid); setPick(null); }} />}
    </div>
  );
}

export function GuestShell() {
  const { guest, guestOnly } = useUi(), setGuest = useUi(s => s.setGuest);
  const tables = useTables().data, seed = useMyTakeouts(s => s.seed);
  useEffect(() => {
    if (!guestOnly) api.guest.demoTakeoutId().then(seed);
  }, [guestOnly, seed]);
  const takeout = guest.table === TO, t = takeout ? null : tables.find(x => x.id === guest.table);

  if (!takeout && !t) {
    if (guestOnly) return (
      <main className="phone-wrap"><div className="phone"><div className="g-scroll"><div className="center">
        <div className="big-ic"><Icon name="qr" size={32} /></div><h3>We can't find this table</h3><p className="muted">Ask your waiter for a new QR code.</p>
      </div></div></div></main>
    );
    return <main className="main"><div className="wrap"><div className="card empty">Add a table in Settings to preview the guest view.</div></div></main>;
  }
  const phone = <Phone key={guest.table} tableId={guest.table} />;
  if (guestOnly) return <main className="phone-wrap">{phone}</main>;
  return (
    <main className="main"><div className="wrap"><div className="guest-layout">
      <aside className="side card">
        <h2>Guest view</h2>
        <p className="muted">{takeout ? 'This is what customers see after scanning the Takeout QR. They order, get a pickup number, and pay when they pick up.' : 'This is what guests see on their phone after scanning the table QR.'}</p>
        <label className="field"><span>QR code</span>
          <select id="g-table" className="input" value={guest.table} onChange={e => setGuest({ table: e.target.value, tab: 'menu' })}>
            {tables.map(x => <option key={x.id} value={x.id}>{x.name} · {TSTAT[x.status].l}</option>)}
            <option value={TO}>Takeout QR</option>
          </select>
        </label>
        {!takeout && (
          <div className="field"><span>You are</span>
            <div className="gsel" role="group" aria-label="Guest">
              {['Guest 1', 'Guest 2', 'Guest 3'].map(g => <button key={g} className="chip" aria-pressed={guest.name === g} onClick={() => setGuest({ name: g })}><Icon name="user" size={16} />{g}</button>)}
            </div>
            <span className="hint">Many guests share one QR. Switch guests to see the shared plate.</span>
          </div>
        )}
        <button className="btn btn-outline" onClick={() => useUi.getState().set({ mode: 'staff' })}>Back to staff view</button>
      </aside>
      {phone}
    </div></div></main>
  );
}
