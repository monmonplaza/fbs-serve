import { api } from '@/api';
import { useReservations, useTables, invalidateOutside } from '@/api/queries';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { RowActions } from '@/components/RowActions';
import { usePaged } from '@/components/Pager';
import { useNow } from '@/lib/useNow';
import { REMIND_BEFORE, RES_MIN } from '@/lib/reservations';
import { dt, peso } from '@/lib/format';
import type { Reservation } from '@/api/types';
import { RSTAT, addDays, resTotal, sod, useResUi, weekStart, whenText } from './helpers';
import { openJump, openRes, openResForm, resActions, seatNow } from './actions';
import { MonthView, WeekView } from './Calendar';

/** Seat a reservation now (assigns the table, opens its QR session and puts any advance order on the plate). */
export function openSeatReservation(id: string) { return seatNow(id); }
export async function openReservation(id: string) {
  const r = (await api.reservations.list()).find(x => x.id === id);
  if (r) openRes(r);
}
export async function dismissReservation(id: string) {
  await api.reservations.dismiss(id);
  await invalidateOutside('reservations');
}

const VIEWS = [['month', 'Month', 'calendar'], ['week', 'Week', 'grid'], ['list', 'List', 'list']] as const;

export function ReservationsPage() {
  const { view: v, day, status, range, q: qs, set } = useResUi();
  const list = useReservations().data;
  useNow();
  const ws = weekStart(day), we = addDays(ws, 6);
  const title = v === 'week' ? `${dt(ws)} – ${dt(we)}, ${new Date(we).getFullYear()}` : new Date(day).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const nav = (n: number) => {
    if (v === 'week') return set({ day: addDays(day, 7 * n) });
    const x = new Date(day), d = x.getDate();
    x.setDate(1); x.setMonth(x.getMonth() + n);
    x.setDate(Math.min(d, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
    set({ day: +x });
  };
  return (
    <>
      <div className="page-head">
        <div><h1>Reservations</h1><p className="muted">Book, move and cancel reservations. Staff get a reminder {REMIND_BEFORE} minutes before each one.</p></div>
        <button className="btn btn-primary" onClick={() => openResForm(null, day)}><Icon name="plus" size={20} />New reservation</button>
      </div>
      <div className="res-bar">
        {v !== 'list' ? (
          <>
            <div className="res-nav">
              <button className="icon-btn" aria-label={`Previous ${v}`} onClick={() => nav(-1)}><Icon name="left" /></button>
              <button className="icon-btn" aria-label={`Next ${v}`} onClick={() => nav(1)}><Icon name="right" /></button>
            </div>
            <button className="res-title" aria-label={`Go to a date. Showing ${title}`} onClick={openJump}>{title}</button>
            <button className="btn btn-outline" onClick={() => set({ day: sod(Date.now()) })}>Today</button>
          </>
        ) : null}
        <div className="spacer" />
        {v !== 'list' ? <div className="legend" aria-label="Status colors">{Object.values(RSTAT).map(m => <Pill key={m.l} meta={m} />)}</div> : null}
        <div className="seg" role="group" aria-label="Calendar view">
          {VIEWS.map(([k, l, ic]) => <button key={k} aria-pressed={v === k} onClick={() => set({ view: k })}><Icon name={ic} size={20} />{l}</button>)}
        </div>
      </div>
      {v === 'month' ? <MonthView list={list} /> : v === 'week' ? <WeekView list={list} /> : <ListView list={list} status={status} range={range} q={qs} />}
    </>
  );
}

function ListView({ list, status, range, q: qs }: { list: Reservation[]; status: string; range: string; q: string }) {
  const set = useResUi(s => s.set);
  const tables = useTables().data;
  const tName = (id: string) => tables.find(t => t.id === id)?.name || 'Deleted table';
  const q = qs.trim().toLowerCase(), n = Date.now();
  const ended = (r: Reservation) => r.at + RES_MIN * 60000 < n;
  const rows = list.filter(r => (status === 'all' || r.status === status) && (range === 'all' || (range === 'past') === ended(r)) && (!q || r.name.toLowerCase().includes(q) || (r.phone || '').includes(q)))
    .sort((a, b) => (range === 'past' ? b.at - a.at : a.at - b.at));
  const pg = usePaged(rows, `${status}|${range}|${q}`);
  return (
    <>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="When">
          {([['upcoming', 'Upcoming'], ['past', 'Past'], ['all', 'All']] as const).map(([k, l]) => <button key={k} className="chip" aria-pressed={range === k} onClick={() => set({ range: k })}>{l}</button>)}
        </div>
        <div className="chips" role="group" aria-label="Status">
          {([['all', 'All'], ...Object.entries(RSTAT).map(([k, m]) => [k, m.l])] as [string, string][]).map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={status === k} onClick={() => set({ status: k as 'all' })}>{l}</button>
          ))}
        </div>
        <div className="spacer" />
        <label className="search"><span className="sr" hidden>Search reservations</span><Icon name="search" />
          <input id="res-q" className="input" placeholder="Search name or phone" value={qs} onChange={e => set({ q: e.target.value })} aria-label="Search reservations" /></label>
      </div>
      <div className="tbl-scroll"><table className="data">
        <thead><tr><th>When</th><th>Guest</th><th className="r">Guests</th><th>Table</th><th>Advance order</th><th>Status</th><th className="r">Actions</th></tr></thead>
        <tbody>
          {pg.rows.map(r => (
            <tr key={r.id} className="click" onClick={() => openRes(r)}>
              <td className="num" style={{ whiteSpace: 'nowrap' }}>{whenText(r.at)}</td>
              <td><b>{r.name}</b>{r.phone ? <div className="caption muted num">{r.phone}</div> : null}</td>
              <td className="r num">{r.pax}</td>
              <td>{r.tableId ? tName(r.tableId) : <span className="muted">Not assigned</span>}</td>
              <td>{r.order?.length ? <><span className="pill p-brand"><Icon name="receipt" size={14} />Pre-order</span> <span className="caption muted num">{peso(resTotal(r))}</span></> : <span className="muted">None</span>}</td>
              <td><Pill meta={RSTAT[r.status]} withIcon={false} /></td>
              <td className="r" style={{ whiteSpace: 'nowrap' }}><RowActions actions={resActions(r)} /></td>
            </tr>
          ))}
          {pg.rows.length ? null : <tr><td colSpan={7}><div className="empty"><Icon name="calendar" size={32} />No reservations match.</div></td></tr>}
        </tbody>
      </table></div>
      {pg.bar}
    </>
  );
}

