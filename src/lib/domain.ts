// Pure helpers over the domain types. No state here, so the same code works on server data and on drafts.
import type { Food, Order, OrderItem, PlateLine } from '@/api/types';
import { OSTAT, TO_OSTAT, type OrderStatusMeta } from '@/api/constants';
import { r2, sum } from './format';

export const hasV = (f?: Food | null): f is Food & { variants: NonNullable<Food['variants']> } => !!f?.variants?.length;
export const vOf = (f: Food, id?: string) => f.variants!.find(v => v.id === id) || f.variants![0];
export const unitPrice = (f: Food, vid?: string) => (hasV(f) ? vOf(f, vid).price : f.price);
export const itemName = (f: Food, vid?: string) => (hasV(f) ? `${f.name} (${vOf(f, vid).name})` : f.name);

export const subtotal = (o: Pick<Order, 'items'>) => sum(o.items.map(i => i.price * i.qty));
export const total = (o: Pick<Order, 'items' | 'discount'>) => r2(subtotal(o) * (1 - (o.discount?.pct || 0) / 100));
/** What to print as the order id: the order's single code, plus the round when the order has several. */
export const orderTag = (o: Pick<Order, 'id' | 'code' | 'round' | 'rounds'>, wholeOrder = false) => (!o.code ? o.id : wholeOrder || (o.rounds ?? 1) < 2 ? o.code : `${o.code} · Round ${o.round}`);
export const isTO = (o: Pick<Order, 'type'>) => o.type === 'takeout';
export const oMeta = (o: Order): OrderStatusMeta => ((isTO(o) && TO_OSTAT[o.status]) || OSTAT[o.status])!;

/** The slowest dish sets the estimated wait. */
export const orderEta = (items: OrderItem[], foods: Food[]) => Math.max(1, ...items.map(i => foods.find(f => f.id === i.foodId)?.eta || 15));

/** Merges plate lines (one per guest) into order items, one per food and variant. */
export function plateItems(plate: PlateLine[], foods: Food[]): OrderItem[] {
  const items: OrderItem[] = [];
  plate.forEach(l => {
    const f = foods.find(x => x.id === l.foodId);
    if (!f) return;
    // Lines with different notes stay separate so the kitchen sees each request.
    const note = l.note?.trim() || undefined;
    const e = items.find(i => i.foodId === f.id && i.variantId === l.variantId && i.note === note);
    if (e) e.qty += l.qty;
    else items.push({ foodId: f.id, variantId: l.variantId, name: itemName(f, l.variantId), price: unitPrice(f, l.variantId), qty: l.qty, ...(note ? { note } : {}) });
  });
  return items;
}

/** Quantity per item name across orders, for the bill and the top-sellers chart. */
export function aggregate(orders: Order[]) {
  const m = new Map<string, { name: string; qty: number; price: number }>();
  orders.forEach(o => o.items.forEach(i => {
    const e = m.get(i.name) || { name: i.name, qty: 0, price: i.price };
    e.qty += i.qty;
    m.set(i.name, e);
  }));
  return [...m.values()];
}

// Dine-in orders from one table session are one bill: the first order and its additional orders are paid together.
export const billKey = (o: Order, dayOf: (t: number) => number): string | null =>
  isTO(o) || !o.session ? null : `${o.table}|${o.session}|${o.session === 'old' ? dayOf(o.createdAt) : ''}`;
