/**
 * @file api-service/orders/mock.ts
 * Orders, kitchen and payments.
 */

import { assertStock } from "@/api-service/inventory/mock";
import { db } from "@/api-service/mock/db";
import {
    out,
    fail,
    orderOf,
    tableOf,
    sessionOrders,
    settleOrders,
    syncTable,
    newTakeout,
} from "@/api-service/mock/core";
import type { AppliedDiscount, GuestPaid, Order, OrderItem, Payment, TakeoutChannel } from "@/types/restaurant";
import { guestDues } from "@/lib/guestPay";
import { r2, sum } from "@/lib/format";
import { subtotal } from "@/lib/domain";

const discountOf = (id?: string | null): AppliedDiscount | null => {
    const d = id ? db.discounts.find((x) => x.id === id) : null;
    return d ? { name: d.name, pct: d.pct } : null;
};
const dueOf = (orders: Order[], d: AppliedDiscount | null) =>
    r2(sum(orders.map((o) => r2(subtotal(o) * (1 - (d?.pct || 0) / 100)))));
/** Payments must be positive and add up to the amount due. */
function checkPays(pays: Payment[], due: number) {
    const rows = pays.map((p) => ({
        method: p.method,
        amount: r2(p.amount),
        received: p.received == null ? undefined : r2(p.received),
        ref: p.ref?.trim().slice(0, 40) || undefined,
    }));
    if (!rows.length || rows.some((r) => !(r.amount > 0)) || r2(sum(rows.map((r) => r.amount)) - due) !== 0)
        fail(`The payments must add up to ₱${due.toFixed(2)}`);
    if (rows.length === 1 && rows[0].received != null && rows[0].received < due)
        fail(`The amount received is less than the amount due (₱${due.toFixed(2)})`);
    return rows;
}
const billOf = (o: Order) =>
    o.session ? db.orders.filter((x) => x.table === o.table && x.session === o.session && x.type !== "takeout") : [o];

export const orders = {
    list: async () => out(db.orders),

    /** Receives payment for every unpaid order of a table's session. The table then waits to be cleaned. */
    payTable: async (tableId: string, discountId: string | null, pays: Payment[]) => {
        const t = tableOf(tableId) ?? fail("Table not found");
        const os = sessionOrders(t).filter((o) => o.status !== "paid");
        const d = discountOf(discountId);
        settleOrders(os, checkPays(pays, dueOf(os, d)), d);
        Object.assign(t, { status: "cleaning", bill: null });
        return out({ table: t });
    },

    /**
     * Pays the whole bill (first order and additional orders) that the given order belongs to, from the Orders screen.
     * The table is cleaned up once nothing on it is unpaid.
     */
    payBill: async (orderId: string, discountId: string | null, pays: Payment[]) => {
        const o = orderOf(orderId) ?? fail("Order not found");
        const grp = billOf(o).filter((x) => x.status !== "paid");
        const d = discountOf(discountId);
        settleOrders(grp, checkPays(pays, dueOf(grp, d)), d);
        const t = tableOf(o.table);
        if (t && t.token && o.session === t.token && ["active", "ordering", "eating", "billout"].includes(t.status)) {
            if (sessionOrders(t).some((x) => x.status !== "paid")) syncTable(t);
            else Object.assign(t, { status: "cleaning", bill: null });
        }
        return out({ count: grp.length, payment: o.payment ?? "", table: t ?? null });
    },

    /**
     * One guest pays for the dishes they added (a whole share, one method, their own discount). The bill closes when the last
     * guest has paid; the discounts of all guests are then spread over its orders.
     */
    payGuest: async (orderId: string, guest: string, discountId: string | null, pay: Payment) => {
        const o = orderOf(orderId) ?? fail("Order not found");
        const grp = billOf(o).filter((x) => x.status !== "paid");
        if (!grp.length || grp.some((x) => x.status !== "served"))
            fail("Some food is not served yet. Serve every order before taking payment.");
        const due = guestDues(grp).find((g) => g.share.key === guest);
        if (!due || !(due.remaining > 0)) fail("This guest has nothing left to pay.");
        const d = discountOf(discountId);
        const amount = r2(due!.remaining * (1 - (d?.pct || 0) / 100));
        if (r2(pay.amount) !== amount) fail(`The payment must be ₱${amount.toFixed(2)}`);
        if (pay.received != null && pay.received < amount)
            fail(`The amount received is less than the amount due (₱${amount.toFixed(2)})`);
        const paid: GuestPaid[] = grp.find((x) => x.guestPaid)?.guestPaid ?? [];
        paid.push({
            guest,
            method: pay.method,
            gross: due!.remaining,
            amount,
            ...(d ? { discount: d } : {}),
            ...(pay.ref?.trim() ? { ref: pay.ref.trim().slice(0, 40) } : {}),
        });
        grp.forEach((x) => (x.guestPaid = paid));
        let closed = false;
        if (guestDues(grp).every((g) => g.remaining <= 0)) {
            closed = true;
            const gross = r2(sum(paid.map((p) => p.gross))),
                net = r2(sum(paid.map((p) => p.amount)));
            const names = [...new Set(paid.flatMap((p) => (p.discount ? [p.discount.name] : [])))];
            const methods = [...new Set(paid.map((p) => p.method))];
            let left = r2(gross - net);
            grp.forEach((x, i) => {
                const off = i === grp.length - 1 ? left : r2(((gross - net) * subtotal(x)) / (gross || 1));
                left = r2(left - off);
                Object.assign(x, {
                    status: "paid",
                    paidAt: Date.now(),
                    payment: methods.length > 1 ? "split" : methods[0],
                    payments: methods.map((m) => ({
                        method: m,
                        amount: r2(
                            (sum(paid.filter((p) => p.method === m).map((p) => p.amount)) * (subtotal(x) - off)) /
                                (net || 1),
                        ),
                    })),
                    discount: gross > net ? { name: names.join(", "), pct: 0, amount: off } : null,
                });
            });
            const refs = paid.flatMap((p) => (p.ref ? [p.ref] : [])).join(", ");
            if (refs) grp.forEach((x) => (x.payRef = refs));
        }
        const t = tableOf(o.table);
        if (
            closed &&
            t &&
            t.token &&
            o.session === t.token &&
            ["active", "ordering", "eating", "billout"].includes(t.status)
        ) {
            if (sessionOrders(t).some((x) => x.status !== "paid")) syncTable(t);
            else Object.assign(t, { status: "cleaning", bill: null });
        }
        return out({ closed, table: t ?? null });
    },

    /** Pay on pickup: one takeout order, paid and handed over at the counter. */
    payPickup: async (orderId: string, discountId: string | null, pays: Payment[]) => {
        const o = orderOf(orderId) ?? fail("Order not found");
        const d = discountOf(discountId);
        settleOrders([o], checkPays(pays, dueOf([o], d)), d);
        return out(o);
    },

    /** GrabFood and Foodpanda orders are paid in the app; the counter only hands them to the rider. */
    handover: async (orderId: string) => {
        const o = orderOf(orderId) ?? fail("Order not found");
        settleOrders([o], [{ method: o.channel!, amount: r2(subtotal(o)) }], null);
        return out(o);
    },

    /** Counter takeout entry. */
    placeTakeout: async (items: OrderItem[], customer: string, phone: string, channel: TakeoutChannel, ref: string) => {
        if (!customer.trim()) fail("Enter the customer name first");
        assertStock(items);
        return out(newTakeout(items, customer.trim(), phone.trim(), "counter", channel, ref.trim()));
    },
};
