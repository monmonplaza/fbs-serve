/**
 * @file api-service/reports/mock.ts
 * Reports without a backend, worked out from the in-memory orders with the same rules as the server (src/Support/SalesReport.php).
 * Days are the browser's days here, since the mock has no server time zone.
 */

import { db } from "@/api-service/mock/db";
import { out, fail } from "@/api-service/mock/core";
import { isTO, subtotal } from "@/lib/domain";
import { r2, sum } from "@/lib/format";
import type { Order, ReportGroup, SalesPeriod, SalesReport, SalesTotals } from "@/types/restaurant";

export interface SalesQuery {
    from: string;
    to: string;
    group?: ReportGroup | "auto";
    /** Another period to compare with; by default the same number of days right before. */
    compareFrom?: string;
    compareTo?: string;
}

const VAT = 0.12;
const DAY = 86400000;
const ymd = (t: Date) =>
    `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
};
const addDays = (t: Date, n: number) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + n);
const daysBetween = (a: Date, b: Date) => Math.round((+b - +a) / DAY) + 1;
const mondayOf = (t: Date) => addDays(t, -((t.getDay() + 6) % 7));
const CHANNELS: Record<string, string> = {
    dine_in: "Dine-in",
    walkin: "Takeout",
    grab: "GrabFood",
    panda: "Foodpanda",
};

interface Sale {
    o: Order;
    paid: Date;
    gross: number;
    net: number;
    channel: string;
}
const load = (from: Date, to: Date): Sale[] =>
    db.orders
        .filter((o) => o.status === "paid" && o.paidAt)
        .map((o) => {
            const gross = r2(subtotal(o));
            return {
                o,
                paid: new Date(o.paidAt!),
                gross,
                net: r2(gross * (1 - (o.discount?.pct ?? 0) / 100)),
                channel: isTO(o) ? (o.channel ?? "walkin") : "dine_in",
            };
        })
        .filter((s) => s.paid >= from && s.paid < addDays(to, 1));

const totals = (sales: Sale[]): SalesTotals => {
    const net = r2(sum(sales.map((s) => s.net))),
        vatable = r2(net / (1 + VAT)),
        n = sales.length;
    return {
        orders: n,
        gross: r2(sum(sales.map((s) => s.gross))),
        discounts: r2(sum(sales.map((s) => s.gross - s.net))),
        net,
        vatable,
        vat: r2(net - vatable),
        avgOrder: n ? r2(net / n) : 0,
        guests: sum(sales.map((s) => (isTO(s.o) ? 0 : (db.tables.find((t) => t.id === s.o.table)?.guests ?? 0)))),
        itemsSold: sum(sales.flatMap((s) => s.o.items.map((i) => i.qty))),
    };
};

const tally = <T>(sales: Sale[], key: (s: Sale) => string, make: (k: string, rows: Sale[]) => T) => {
    const groups = new Map<string, Sale[]>();
    sales.forEach((s) => groups.set(key(s), [...(groups.get(key(s)) ?? []), s]));
    return [...groups].map(([k, rows]) => make(k, rows));
};

/** Orders placed in the range that are not paid yet (amounts before any discount, which is chosen when the bill is paid). */
const openOrders = (from: Date, to: Date): SalesReport["open"] => {
    const list = db.orders
        .filter((o) => o.status !== "paid" && o.createdAt >= +from && o.createdAt < +addDays(to, 1))
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((o) => ({
            code: o.code ?? o.id,
            table: isTO(o)
                ? `Takeout ${o.pickup ?? ""}`.trim()
                : (db.tables.find((t) => t.id === o.table)?.name ?? null),
            at: o.createdAt,
            amount: r2(subtotal(o)),
        }));
    return { orders: list.length, amount: r2(sum(list.map((o) => o.amount))), list: list.slice(0, 10) };
};

export const reports = {
    sales: async (q: SalesQuery) => {
        const from = parse(q.from),
            to = parse(q.to);
        const days = daysBetween(from, to);
        if (!(days >= 1)) fail("The end date must be the same as or after the start date.");
        if (days > 366) fail("Pick a range of 366 days or fewer.");
        const group: ReportGroup =
            !q.group || q.group === "auto" ? (days <= 31 ? "day" : days <= 186 ? "week" : "month") : q.group;
        const sales = load(from, to);
        const prevTo = q.compareTo ? parse(q.compareTo) : addDays(from, -1),
            prevFrom = q.compareFrom ? parse(q.compareFrom) : addDays(from, -days);

        const key = (t: Date) =>
            group === "week" ? ymd(mondayOf(t)) : group === "month" ? ymd(t).slice(0, 7) : ymd(t);
        const rows = new Map<string, SalesPeriod>();
        for (let t = from; t <= to; t = addDays(t, 1)) {
            const k = key(t);
            const row = rows.get(k) ?? { key: k, from: ymd(t), to: ymd(t), orders: 0, gross: 0, discounts: 0, net: 0 };
            row.to = ymd(t);
            rows.set(k, row);
        }
        sales.forEach((s) => {
            const r = rows.get(key(s.paid))!;
            r.orders++;
            r.gross = r2(r.gross + s.gross);
            r.discounts = r2(r.discounts + s.gross - s.net);
            r.net = r2(r.net + s.net);
        });

        const lines = sales.flatMap((s) =>
            s.o.items.map((i) => ({ i, cat: db.foods.find((f) => f.id === i.foodId)?.cat })),
        );
        const catName = (id?: string) => db.categories.find((c) => c.id === id)?.name ?? "Other";
        const byName = new Map<string, { name: string; category: string; qty: number; sales: number }>();
        lines.forEach(({ i, cat }) => {
            const e = byName.get(i.name) ?? { name: i.name, category: catName(cat), qty: 0, sales: 0 };
            e.qty += i.qty;
            e.sales = r2(e.sales + i.price * i.qty);
            byName.set(i.name, e);
        });
        // Sales before order discounts, since a discount belongs to the whole bill.
        const cats = new Map<string, { category: string; qty: number; sales: number }>();
        lines.forEach(({ i, cat }) => {
            const e = cats.get(catName(cat)) ?? { category: catName(cat), qty: 0, sales: 0 };
            e.qty += i.qty;
            e.sales = r2(e.sales + i.price * i.qty);
            cats.set(e.category, e);
        });
        const payNames = new Map(db.payments.map((p) => [p.id, p.name]));
        const pays = new Map<string, { method: string; name: string; count: number; amount: number }>();
        sales.forEach((s) =>
            (s.o.payments?.length ? s.o.payments : [{ method: s.o.payment ?? "", amount: s.net }]).forEach((p) => {
                const e = pays.get(p.method) ?? {
                    method: p.method,
                    name: payNames.get(p.method) ?? `Method ${p.method}`,
                    count: 0,
                    amount: 0,
                };
                e.count++;
                e.amount = r2(e.amount + p.amount);
                pays.set(p.method, e);
            }),
        );

        const report: SalesReport = {
            range: { from: q.from, to: q.to, days, group, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            totals: totals(sales),
            previous: { from: ymd(prevFrom), to: ymd(prevTo), ...totals(load(prevFrom, prevTo)) },
            series: [...rows.values()],
            byHour: Array.from({ length: 24 }, (_, hour) => {
                const here = sales.filter((s) => s.paid.getHours() === hour);
                return { hour, orders: here.length, net: r2(sum(here.map((s) => s.net))) };
            }),
            byPayment: [...pays.values()].sort((a, b) => b.amount - a.amount),
            byChannel: tally(
                sales,
                (s) => s.channel,
                (k, rs) => ({
                    channel: k,
                    name: CHANNELS[k] ?? k,
                    orders: rs.length,
                    net: r2(sum(rs.map((s) => s.net))),
                }),
            ).sort((a, b) => b.net - a.net),
            byCategory: [...cats.values()].sort((a, b) => b.sales - a.sales),
            items: [...byName.values()].sort((a, b) => b.qty - a.qty),
            byTable: tally(
                sales.filter((s) => s.channel === "dine_in" && s.o.table),
                (s) => db.tables.find((t) => t.id === s.o.table)?.name ?? "Table",
                (k, rs) => ({
                    table: k,
                    floor: db.floors.find((f) => f.id === db.tables.find((t) => t.name === k)?.floor)?.name ?? null,
                    orders: rs.length,
                    guests: sum(rs.map((s) => db.tables.find((t) => t.id === s.o.table)?.guests ?? 0)),
                    net: r2(sum(rs.map((s) => s.net))),
                }),
            ).sort((a, b) => b.net - a.net),
            open: openOrders(from, to),
            discounts: tally(
                sales.filter((s) => s.o.discount && s.gross > s.net),
                (s) => s.o.discount!.name,
                (k, rs) => ({
                    name: k,
                    pct: rs[0].o.discount!.pct,
                    orders: rs.length,
                    amount: r2(sum(rs.map((s) => s.gross - s.net))),
                }),
            ).sort((a, b) => b.amount - a.amount),
        };
        return out(report);
    },
};
