import type { Order } from "@/types/restaurant";
import { isTO, oMeta, orderTag, total } from "@/lib/domain";
import { dt, sum } from "@/lib/format";
import { chanOf } from "@/lib/ordersHelpers";

/** Column filters for the Orders table. list: show only the checked values (none checked = all); range: min and max; text: contains. */
export interface Col {
    k: string;
    l: string;
    t: "list" | "range" | "text";
    r?: boolean;
    v: (o: Order) => string | number;
}
export type ColValue = string[] | { min: string; max: string } | string;

export const buildCols = (tName: (id: string | null) => string, payName: (id?: string) => string): Col[] => [
    { k: "id", l: "Order ID", t: "text", v: (o) => orderTag(o) },
    { k: "status", l: "Status", t: "list", v: (o) => oMeta(o).l },
    { k: "table", l: "Table or pickup", t: "list", v: (o) => (isTO(o) ? `Takeout · ${chanOf(o).l}` : tName(o.table)) },
    { k: "day", l: "Date and time", t: "list", v: (o) => dt(o.createdAt) },
    { k: "items", l: "Items", t: "range", v: (o) => sum(o.items.map((i) => i.qty)) },
    { k: "pay", l: "Payment", t: "list", v: (o) => (o.payment ? payName(o.payment) : "Not yet") },
    { k: "total", l: "Total", t: "range", r: true, v: (o) => total(o) },
];
export const cfBlank = (c: Col): ColValue => (c.t === "list" ? [] : c.t === "range" ? { min: "", max: "" } : "");
export const blankAll = (cols: Col[]) =>
    Object.fromEntries(cols.map((c) => [c.k, cfBlank(c)])) as Record<string, ColValue>;
export const cfOn = (c: Col, f: Record<string, ColValue>) => {
    const v = f[c.k];
    return Array.isArray(v) ? v.length > 0 : typeof v === "string" ? !!v.trim() : v.min !== "" || v.max !== "";
};
export const cfMatch = (cols: Col[], f: Record<string, ColValue>) => (o: Order) =>
    cols.every((c) => {
        if (!cfOn(c, f)) return true;
        const x = c.v(o),
            v = f[c.k];
        if (Array.isArray(v)) return v.includes(String(x));
        if (typeof v === "string") return String(x).toUpperCase().includes(v.trim().toUpperCase());
        return (v.min === "" || +x >= +v.min) && (v.max === "" || +x <= +v.max);
    });

export function inRange(d: number, r: string) {
    const t = new Date(d),
        n = new Date();
    if (r === "today") return t.toDateString() === n.toDateString();
    if (r === "week") {
        const s = new Date(n);
        s.setHours(0, 0, 0, 0);
        s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
        return t >= s;
    }
    return t.getFullYear() === n.getFullYear() && t.getMonth() === n.getMonth();
}

export const FLOW = ["queued", "cooking", "plating", "completed", "served", "paid"];
