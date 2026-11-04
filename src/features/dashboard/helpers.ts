import type { DiningTable, Order } from '@/api/types';
export { aggregate, isTO, oMeta, total } from '@/lib/domain';

/** Orders of the table's current session, from an orders list (client-side view of core.sessionOrders). */
export const sessionOrdersOf = (orders: Order[]) => (t: DiningTable) => (t.token ? orders.filter(o => o.table === t.id && o.session === t.token) : []);
