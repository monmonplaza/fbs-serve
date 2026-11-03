// TODO(port): Orders module (list, column filters, grouped bills, payment, takeout).
import type { DiningTable } from '@/api/types';

export function OrdersPage() {
  return <div className="page-head"><div><h1>Orders</h1><p className="muted">Not ported yet.</p></div></div>;
}
/** Opens the payment modal for every unpaid order of a table's session (used by the "asking for the bill" banner). */
export function openPayTable(_table: DiningTable) { /* TODO(port) */ }
