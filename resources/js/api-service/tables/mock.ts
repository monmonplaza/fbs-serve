/**
 * @file api-service/tables/mock.ts
 * Tables, floors and QR sessions.
 */

import { db } from "@/api-service/mock/db";
import { out, tableOf, orderOf, syncTable, fail, uid, nextId } from "@/api-service/mock/core";
import { orderEta } from "@/lib/domain";
import { clamp, r2 } from "@/lib/format";
import type { DiningTable, Order, OrderItem } from "@/types/restaurant";

const need = (id: string) => tableOf(id) ?? fail("Table not found");

export const tables = {
    list: async () => out(db.tables),
    floors: async () => out(db.floors),

    /** Guests sit down: new QR session, empty plate. */
    activate: async (id: string, guests: number) => {
        const t = need(id);
        Object.assign(t, { status: "active", token: uid(), openedAt: Date.now(), bill: null, guests });
        db.plates[t.id] = [];
        return out(t);
    },
    /** Staff enter the order for a table whose guests have no phone. It goes to the kitchen like a guest send. */
    order: async (id: string, items: OrderItem[], by: string) => {
        const t = need(id);
        if (!t.token || !["active", "ordering", "eating"].includes(t.status))
            return fail(
                t.status === "billout" ? "The bill was already requested for this table." : "Activate the table first.",
            );
        const lines = items.filter((i) => i.qty > 0);
        if (!lines.length) return fail("Add food to the order first");
        const o: Order = {
            id: nextId(),
            table: t.id,
            session: t.token,
            items: lines.map((i) => ({ ...i })),
            status: "queued",
            createdAt: Date.now(),
            by,
            eta: orderEta(lines, db.foods),
        };
        db.orders.push(o);
        syncTable(t);
        return out(o);
    },
    /** Back to inactive. The old QR token stops working. */
    clean: async (id: string) => {
        const t = need(id);
        Object.assign(t, { status: "inactive", token: null, openedAt: null, bill: null, guests: null });
        db.plates[t.id] = [];
        return out(t);
    },
    /** A waiter serves an order that the kitchen sent out. */
    serveOrder: async (orderId: string) => {
        const o = orderOf(orderId) ?? fail("Order not found");
        o.status = "served";
        o.servedAt = Date.now();
        const t = tableOf(o.table);
        if (t) syncTable(t);
        return out(o);
    },
    /** Layout editing: position in percent, clamped to the floor. */
    move: async (id: string, x: number, y: number) => {
        const t = need(id);
        t.x = r2(clamp(x, 3, 97));
        t.y = r2(clamp(y, 5, 95));
        return out(t);
    },
    add: async (v: { name: string; seats: number; floor: string }) => {
        const t: DiningTable = {
            id: "T" + uid(),
            ...v,
            x: 50,
            y: 50,
            status: "inactive",
            token: null,
            openedAt: null,
            bill: null,
        };
        db.tables.push(t);
        return out(t);
    },
    update: async (id: string, v: Partial<Pick<DiningTable, "name" | "seats" | "floor">>) =>
        Object.assign(need(id), v) && out(need(id)),
    remove: async (id: string) => {
        const t = need(id);
        if (t.status !== "inactive") fail(`${t.name} has guests right now. Collect payment and mark it clean first.`);
        db.tables = db.tables.filter((x) => x.id !== id);
    },
    addFloor: async (name: string) => {
        const f = { id: "f" + uid(), name };
        db.floors.push(f);
        return out(f);
    },
    updateFloor: async (id: string, name: string) => {
        const f = db.floors.find((x) => x.id === id) ?? fail("Floor not found");
        f.name = name;
        return out(f);
    },
    removeFloor: async (id: string) => {
        const f = db.floors.find((x) => x.id === id) ?? fail("Floor not found");
        if (db.floors.length === 1) fail("The restaurant needs at least one floor level.");
        const n = db.tables.filter((t) => t.floor === id).length;
        if (n) fail(`${n} tables are on this floor. Move or delete them first.`);
        db.floors = db.floors.filter((x) => x.id !== f.id);
    },
};
