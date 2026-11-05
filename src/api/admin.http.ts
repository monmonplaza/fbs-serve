// Settings lists that the Laravel backend owns (payment methods, discounts, categories, tables, floors).
// Roles, users and the table timer are not on the backend yet and stay on the mock, so this module wraps the mock and overrides only those lists.
import { http, unwrap } from './http/client';
import { admin as mock, type SettingsList } from './admin';
import type { Discount, Food, PaymentMethod } from './types';

const PATH: Partial<Record<SettingsList, string>> = { payments: '/payment-methods', discounts: '/discounts', categories: '/categories', tables: '/tables', floors: '/floors' };

/** Fields the forms collect, shaped like the mock does (see admin.ts saveSetting). */
function body(list: SettingsList, v: Record<string, unknown>) {
  if (list === 'tables') return { name: String(v.name), seats: Math.min(40, Math.max(1, +(v.seats as number) || 1)), floor: String(v.floor) };
  return v;
}

export const adminHttp = {
  ...mock,
  payments: async () => unwrap<PaymentMethod[]>(await http.get('/payment-methods')),
  discounts: async () => unwrap<Discount[]>(await http.get('/discounts')),
  saveSetting: async (list: SettingsList, id: string | null, v: Record<string, unknown>) => {
    const path = PATH[list];
    if (!path) return mock.saveSetting(list, id, v);
    return unwrap<unknown>(await http.post(id ? `${path}/${id}` : path, body(list, v)));
  },
  /** The server refuses a delete that is blocked and says why, so nothing is checked up front for these lists. */
  deleteBlock: async (list: SettingsList, id: string) => (PATH[list] ? '' : mock.deleteBlock(list, id)),
  deleteSetting: async (list: SettingsList, id: string) => {
    const path = PATH[list];
    if (!path) return mock.deleteSetting(list, id);
    await http.delete(`${path}/${id}`);
  },
  foodCounts: async () => {
    const m: Record<string, number> = {};
    unwrap<Food[]>(await http.get('/foods')).forEach(f => { m[f.cat] = (m[f.cat] || 0) + 1; });
    return m;
  },
};
