/**
 * @file api-service/guest/mock.ts
 * What the guest phone calls: the shared plate and sending it to the kitchen.
 */

import { db } from "@/api-service/mock/db";
import { out, tableOf, sessionOrders, syncTable, nextId, newTakeout, fail, uid } from "@/api-service/mock/core";
import { TO } from "@/lib/constants";
import type { Order } from "@/types/restaurant";
import { plateItems, orderEta, itemName } from "@/lib/domain";
import { sum } from "@/lib/format";
import { total } from "@/lib/domain";

const plateOf = (key: string) => (db.plates[key] = db.plates[key] || []);

export const guest = {
    /** Opened from a table QR code: the phone joins that table's session (the prototype has no server, so it creates it). */
    join: async (tableId: string, token: string) => {
        const t = tableOf(tableId);
        if (t) {
            Object.assign(t, { status: "active", token, openedAt: Date.now(), bill: null });
            db.plates[t.id] = [];
        }
    },
    plate: async (tableId: string) => out(db.plates[tableId] ?? []),
    /** The Takeout-QR order the guest preview starts with (demo only). */
    demoTakeoutId: async () => db.demoTakeoutId ?? null,
    /** Adds one of a food to the shared plate; the same guest adding the same dish again raises its quantity. */
    addLine: async (tableId: string, foodId: string, variantId: string | undefined, by: string) => {
        const f = db.foods.find((x) => x.id === foodId);
        if (!f) return fail("This dish is no longer on the menu");
        if (f.status !== "available") return fail(`${f.name} is not available`);
        const p = plateOf(tableId);
        const l = p.find((x) => x.foodId === foodId && x.variantId === variantId && x.by === by);
        if (l) l.qty++;
        else p.push({ id: uid(), foodId, variantId, qty: 1, by });
        return out({ name: itemName(f, variantId) });
    },
    /** Changes a line by +1/-1; a line that drops below 1 is removed. */
    changeQty: async (tableId: string, lineId: string, delta: number) => {
        const p = plateOf(tableId),
            l = p.find((x) => x.id === lineId);
        if (!l) return;
        l.qty += delta;
        if (l.qty < 1) db.plates[tableId] = p.filter((x) => x !== l);
    },
    /** Sets or clears the cooking request on a plate line (max 120 characters). */
    setNote: async (tableId: string, lineId: string, note: string) => {
        const l = plateOf(tableId).find((x) => x.id === lineId);
        if (!l) return;
        const n = note.trim().slice(0, 120);
        if (n) l.note = n;
        else delete l.note;
    },
    /** Sends the table's shared plate to the kitchen as a new order. */
    send: async (tableId: string, by: string) => {
        const t = tableOf(tableId),
            p = plateOf(tableId);
        if (!t || !t.token) return fail("This table is not active");
        if (!p.length) return fail("Your plate is empty");
        const items = plateItems(p, db.foods);
        const o: Order = {
            id: nextId(),
            table: t.id,
            session: t.token,
            items,
            status: "queued",
            createdAt: Date.now(),
            by,
            eta: orderEta(items, db.foods),
        };
        db.orders.push(o);
        db.plates[t.id] = [];
        syncTable(t);
        return out(o);
    },
    /** The guest asks for the bill and picks how to pay. */
    billOut: async (tableId: string, method: string) => {
        const t = tableOf(tableId);
        if (!t) return fail("Table not found");
        t.status = "billout";
        t.bill = { method, at: Date.now() };
        return out({ name: t.name, total: sum(sessionOrders(t).map(total)) });
    },
    /** Places the Takeout-QR plate as a takeout order. */
    placeTakeout: async (name: string, phone: string) => {
        const p = plateOf(TO);
        if (!p.length) return fail("Your plate is empty");
        const o = newTakeout(plateItems(p, db.foods), name, phone, "qr");
        db.plates[TO] = [];
        return out(o);
    },
};
