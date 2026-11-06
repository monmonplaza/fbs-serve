/**
 * @file api-service/kitchen/mock.ts
 * Kitchen queue: moving orders through cooking, plating, order out, served and ready for pickup.
 */

import { db } from "@/api-service/mock/db";
import { out, orderOf, tableOf, syncTable, fail } from "@/api-service/mock/core";
import { KITCHEN } from "@/lib/constants";
import { isTO } from "@/lib/domain";
import { useUi } from "@/context/ui";

const need = (id: string) => orderOf(id) ?? fail("Order not found");
const tName = (id: string | null) => tableOf(id)?.name ?? "";

export const kitchen = {
    queue: async () => out(db.orders.filter((o) => ["queued", "cooking", "plating", "completed"].includes(o.status))),

    /** Queued, then cooking, then plating, then order out. Notifies the floor (or the counter) when the food is out. */
    next: async (id: string) => {
        const o = need(id);
        const nxt = KITCHEN[KITCHEN.indexOf(o.status) + 1];
        if (!nxt || o.status === "completed") fail("This order is already out");
        o.status = nxt;
        if (o.status === "completed") {
            useUi
                .getState()
                .notify(
                    "plate",
                    isTO(o)
                        ? `${o.pickup} is cooked and ready to pack`
                        : `${o.id} is ready to serve to ${tName(o.table)}`,
                    isTO(o) ? "orders" : "tables",
                );
        }
        return out(o);
    },

    /** Takeout leaves the kitchen for the counter. Payment and pickup are marked in Orders. */
    toReady: async (id: string) => {
        const o = need(id);
        o.status = "ready";
        o.readyAt = Date.now();
        useUi.getState().notify("bag", `${o.pickup} is ready for pickup at the counter`, "orders");
        return out(o);
    },

    /** Dine-in order out becomes served, and the table follows its orders. */
    serve: async (id: string) => {
        const o = need(id);
        o.status = "served";
        o.servedAt = Date.now();
        const t = tableOf(o.table);
        if (t) syncTable(t);
        return out(o);
    },
};
