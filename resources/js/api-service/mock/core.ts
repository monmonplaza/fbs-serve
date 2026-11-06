/**
 * @file api-service/mock/core.ts
 * Server-side rules shared by every mock API module. A real backend implements these in its own code.
 */

import { db } from "@/api-service/mock/db";
import { KITCHEN } from "@/lib/constants";
import type {
    DiningTable,
    Order,
    OrderItem,
    AppliedDiscount,
    Payment,
    TakeoutChannel,
    TakeoutSource,
} from "@/types/restaurant";
import { r2, sum, uid } from "@/lib/format";
import { subtotal, orderEta } from "@/lib/domain";

/** Responses are copies, so callers (and React Query) can never mutate the database by accident. */
export const out = <T>(v: T): T => structuredClone(v);
export const tableOf = (id: string | null | undefined) => db.tables.find((t) => t.id === id);
export const orderOf = (id: string) => db.orders.find((o) => o.id === id);
export const sessionOrders = (t: DiningTable) =>
    t.token ? db.orders.filter((o) => o.table === t.id && o.session === t.token) : [];
export const nextId = () => "ORD-" + ++db.orderSeq;
export const nextPickup = () => "TO-" + String(++db.takeoutSeq).padStart(3, "0");
export { uid };

/** Active, ordering or eating follows the orders on the table. Bill out and cleaning are set by staff actions. */
export function syncTable(t: DiningTable) {
    if (["inactive", "billout", "cleaning"].includes(t.status)) return;
    const os = sessionOrders(t);
    t.status = !os.length ? "active" : os.some((o) => KITCHEN.includes(o.status)) ? "ordering" : "eating";
}

/** Marks the orders paid. With a split, every order gets its share of each payer's payment (the last order takes the rounding). */
export function settleOrders(orders: Order[], pays: Payment[], dObj: AppliedDiscount | null) {
    const pct = dObj?.pct || 0;
    const totals = orders.map((o) => r2(subtotal(o) * (1 - pct / 100)));
    const grand = r2(sum(totals)) || 1;
    const left = pays.map((x) => x.amount);
    orders.forEach((o, i) => {
        let parts: Payment[];
        if (pays.length === 1) parts = [{ method: pays[0].method, amount: totals[i] }];
        else if (i === orders.length - 1) parts = pays.map((x, j) => ({ method: x.method, amount: r2(left[j]) }));
        else {
            let rest = totals[i];
            parts = pays.map((x, j) => {
                const a = j === pays.length - 1 ? r2(rest) : r2((x.amount * totals[i]) / grand);
                rest = r2(rest - a);
                left[j] = r2(left[j] - a);
                return { method: x.method, amount: a };
            });
        }
        const payRef = pays
            .map((x) => x.ref)
            .filter(Boolean)
            .join(", ");
        Object.assign(o, {
            status: "paid",
            discount: dObj,
            paidAt: Date.now(),
            payments: parts,
            payment: pays.length > 1 ? "split" : pays[0].method,
            ...(payRef ? { payRef } : {}),
        });
        // Bill-level cash handling: what the customer handed over and the change for the whole bill.
        if (pays.length === 1 && pays[0].received != null)
            Object.assign(o, { received: pays[0].received, change: r2(pays[0].received - grand) });
    });
}

/** Error the API throws; the UI shows `message` in a toast. */
export class ApiError extends Error {
    constructor(
        message: string,
        public status = 0,
        public errors?: Record<string, string[]>,
    ) {
        super(message);
    }
}
export const fail = (message: string): never => {
    throw new ApiError(message);
};

/** Creates a takeout order (counter entry, Takeout QR, or a delivery platform) and queues it for the kitchen. */
export function newTakeout(
    items: OrderItem[],
    customer: string,
    phone: string,
    source: TakeoutSource,
    channel: TakeoutChannel = "walkin",
    ref = "",
): Order {
    const o: Order = {
        id: nextId(),
        type: "takeout",
        table: null,
        pickup: nextPickup(),
        customer,
        phone,
        by: customer,
        source,
        channel,
        ref,
        items,
        status: "queued",
        createdAt: Date.now(),
        eta: orderEta(items, db.foods),
    };
    db.orders.push(o);
    return o;
}
