import type { Order } from "@/types/restaurant";
import { r2, sum } from "@/lib/format";

export interface ShareLine {
    name: string;
    qty: number;
    price: number;
    amount: number;
}
/** One person's part of a bill. `net` is after the bill's discount, rounded so every share adds up to the bill. */
export interface GuestShare {
    key: string;
    /** "Guest 482", "Taken by staff (Jun)" or "Shared / not assigned". */
    label: string;
    kind: "guest" | "staff" | "table";
    lines: ShareLine[];
    subtotal: number;
    net: number;
}

/** Names a phone gives itself ("Guest 482"; the older preview names are "Guest 1"). Anything else was typed by staff. */
const isGuestName = (n: string) => /^Guest \d+$/i.test(n.trim());
const guestNo = (n: string) => Number(n.replace(/\D/g, "")) || 0;

/**
 * Splits a table's bill by who added each dish. A dish several guests added is split by how many each added; what nobody
 * claimed (an order from before names were kept, or more on the item than was counted) is "Shared / not assigned". The
 * bill's discount percent is spread over the shares, and the last cent of rounding goes to the largest share, so the shares
 * always add up to what the table pays.
 */
export function guestShares(orders: Order[], pct = 0): GuestShare[] {
    const buckets = new Map<string, GuestShare>();
    const staff = new Set<string>();
    const put = (key: string, label: string, kind: GuestShare["kind"], item: Order["items"][number], qty: number) => {
        const b = buckets.get(key) ?? { key, label, kind, lines: [], subtotal: 0, net: 0 };
        const l = b.lines.find((x) => x.name === item.name && x.price === item.price);
        if (l) {
            l.qty += qty;
            l.amount = r2(l.amount + item.price * qty);
        } else b.lines.push({ name: item.name, qty, price: item.price, amount: r2(item.price * qty) });
        buckets.set(key, b);
    };
    for (const o of orders)
        for (const i of o.items) {
            let left = i.qty;
            for (const [who, q] of Object.entries(i.addedBy ?? {})) {
                const take = Math.min(q, left);
                if (take <= 0) continue;
                left -= take;
                if (isGuestName(who)) put(who.trim(), who.trim(), "guest", i, take);
                else {
                    staff.add(who.trim());
                    put("staff", "Taken by staff", "staff", i, take);
                }
            }
            if (left > 0) put("table", "Shared / not assigned", "table", i, left);
        }
    const shares = [...buckets.values()];
    const factor = 1 - pct / 100;
    shares.forEach((s) => {
        s.subtotal = r2(sum(s.lines.map((l) => l.amount)));
        s.net = r2(s.subtotal * factor);
        if (s.kind === "staff") s.label = `Taken by staff (${[...staff].join(", ")})`;
    });
    // The bill rounds each order's discounted total; make the shares add up to exactly that.
    const due = r2(sum(orders.map((o) => r2(sum(o.items.map((i) => i.price * i.qty)) * factor))));
    const diff = r2(due - sum(shares.map((s) => s.net)));
    if (diff !== 0 && shares.length) {
        const largest = shares.reduce((a, b) => (b.net > a.net ? b : a));
        largest.net = r2(largest.net + diff);
    }
    const order = { guest: 0, staff: 1, table: 2 };
    return shares.sort((a, b) => order[a.kind] - order[b.kind] || guestNo(a.label) - guestNo(b.label));
}

/** Worth showing only when the bill has more than one part. */
export const hasBreakdown = (shares: GuestShare[]) => shares.length > 1;
