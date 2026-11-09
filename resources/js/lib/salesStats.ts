import type { Order } from "@/types/restaurant";
import { total } from "@/lib/domain";
import { r2, sum } from "@/lib/format";

/** Midnight of the day that contains `t`, in the browser's time zone. */
export const dayStart = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return +d;
};
export const addDays = (day: number, n: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + n);
    return +d;
};

/** A sale counts at the moment it was paid (the order time when the payment time is unknown). */
const saleTime = (o: Order) => o.paidAt ?? o.createdAt;

/** Paid orders whose payment falls on the day starting at `day`. */
export const salesOn = (orders: Order[], day: number) => {
    const end = addDays(day, 1);
    return orders.filter((o) => o.status === "paid" && saleTime(o) >= day && saleTime(o) < end);
};

export interface HourSales {
    hour: number;
    amount: number;
    orders: number;
}

/** Sales for each hour of the day (0 to 23). */
export function hourly(orders: Order[], day: number): HourSales[] {
    const rows = Array.from({ length: 24 }, (_, hour) => ({ hour, amount: 0, orders: 0 }));
    for (const o of salesOn(orders, day)) {
        const r = rows[new Date(saleTime(o)).getHours()];
        r.amount = r2(r.amount + total(o));
        r.orders += 1;
    }
    return rows;
}

/** Running total at the end of each hour. */
export const runningTotal = (rows: HourSales[]) => {
    let acc = 0;
    return rows.map((r) => (acc = r2(acc + r.amount)));
};

export const dayTotal = (rows: HourSales[]) => r2(sum(rows.map((r) => r.amount)));

/** The hours to draw: business hours (6 AM to 10 PM), widened to include any sale outside them. */
export function hourRange(...days: HourSales[][]): [number, number] {
    let lo = 6,
        hi = 22;
    for (const rows of days)
        for (const r of rows)
            if (r.amount > 0) {
                lo = Math.min(lo, r.hour);
                hi = Math.max(hi, r.hour);
            }
    return [lo, hi];
}

export const hourLabel = (h: number) => {
    const s = h % 12 === 0 ? 12 : h % 12;
    return `${s} ${h < 12 ? "AM" : "PM"}`;
};
export const shortHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;

/** Clean y-axis ticks from 0 to just above `max`. */
export function ticks(max: number, count = 4): number[] {
    if (max <= 0) return [0, 100, 200, 300];
    const raw = max / count,
        mag = 10 ** Math.floor(Math.log10(raw)),
        step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
    return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** Axis money: in full under 10,000 and compact above it (12K). */
export const axisPeso = (n: number, top: number) =>
    top >= 10000 ? `₱${n >= 1000 ? `${r2(n / 1000)}K` : n}` : `₱${n.toLocaleString("en-PH")}`;
