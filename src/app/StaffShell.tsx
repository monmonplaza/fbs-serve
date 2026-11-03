import type { ComponentType } from 'react';
import { Icon } from '@/components/Icon';
import { NAV, KITCHEN } from '@/api/constants';
import type { ModuleId } from '@/api/types';
import { useOrders, useReservations, useTables, usePayments } from '@/api/queries';
import { useUi } from '@/store/ui';
import { useNow } from '@/lib/useNow';
import { dueReservations, dueText } from '@/lib/reservations';
import { mins, tm } from '@/lib/format';
import { isTO } from '@/lib/domain';
import { LOGO, TopBar } from './TopBar';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { OrdersPage, openPayTable } from '@/features/orders/OrdersPage';
import { KitchenPage } from '@/features/kitchen/KitchenPage';
import { FoodsPage } from '@/features/foods/FoodsPage';
import { TablesPage } from '@/features/tables/TablesPage';
import { ReservationsPage, dismissReservation, openReservation, openSeatReservation } from '@/features/reservations/ReservationsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { GuidePage } from '@/features/guide/GuidePage';

const PAGES: Record<ModuleId, ComponentType> = {
  dashboard: DashboardPage, orders: OrdersPage, kitchen: KitchenPage, foods: FoodsPage, tables: TablesPage,
  reservations: ReservationsPage, settings: SettingsPage, guide: GuidePage,
};

export function StaffShell() {
  const { view, go } = useUi();
  const now = useNow(15000);
  const orders = useOrders().data, tables = useTables().data, reservations = useReservations().data, payments = usePayments().data;
  const bills = tables.filter(t => t.status === 'billout');
  const due = dueReservations(reservations, now);
  const badge: Partial<Record<ModuleId, number>> = {
    kitchen: orders.filter(o => KITCHEN.includes(o.status)).length,
    tables: bills.length,
    orders: orders.filter(o => isTO(o) && o.status === 'ready').length,
    reservations: due.length,
  };
  const payName = (id?: string) => payments.find(p => p.id === id)?.name || id || '';
  const Page = PAGES[view];
  return (
    <div className="shell">
      <nav className="rail" aria-label="Modules" data-keep="rail">
        <div className="rail-brand">{LOGO}<span>FBS Serve<small>Restaurant manager</small></span></div>
        {NAV.map(n => (
          <button key={n.id} className="nav" aria-current={view === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
            <Icon name={n.ic} size={18} />{n.label}
            {badge[n.id] ? <span className="badge num" aria-label={`${badge[n.id]} waiting`}>{badge[n.id]}</span> : null}
          </button>
        ))}
      </nav>
      <main className="main">
        <TopBar brand={false} />
        <div className="wrap">
          {bills.map(t => (
            <div key={t.id} className="alert brand" role="alert">
              <Icon name="bell" />
              <p><b>{t.name} is asking for the bill.</b> Pays with {payName(t.bill?.method)} · {mins(t.bill?.at ?? now)} min ago</p>
              <button className="btn btn-primary" onClick={() => openPayTable(t)}>Receive payment</button>
            </div>
          ))}
          {due.map(r => {
            const tn = tables.find(t => t.id === r.tableId)?.name;
            return (
              <div key={r.id} className="alert rsv" role="alert">
                <Icon name="calendar" />
                <p><b>Reservation at {tm(r.at)} · {r.name}.</b> {r.pax} guests · {tn ?? 'no table yet'}{r.order?.length ? ' · has an advance order' : ''} · {dueText(r, now)}</p>
                <button className="btn btn-primary" onClick={() => openSeatReservation(r.id)}>Seat now</button>
                <button className="btn btn-outline" onClick={() => openReservation(r.id)}>Open</button>
                <button className="icon-btn" aria-label="Got it, dismiss" onClick={() => dismissReservation(r.id)}><Icon name="x" size={18} /></button>
              </div>
            );
          })}
          <Page />
        </div>
        <footer className="foot"><span>© 2026 Frontline Business Solutions</span><span>FBS Serve v1.0</span></footer>
      </main>
    </div>
  );
}
