/**
 * @file api-service/tables/http.ts
 * Tables, floors and QR sessions against the Laravel backend. Same method names and shapes as ./mock.ts.
 */

import { http, unwrap } from "@/api-service/client";
import type { DiningTable, Floor, Order, OrderItem } from "@/types/restaurant";

export const tablesHttp = {
    list: async () => unwrap<DiningTable[]>(await http.get("/tables")),
    floors: async () => unwrap<Floor[]>(await http.get("/floors")),
    activate: async (id: string, guests: number) =>
        unwrap<DiningTable>(await http.post(`/tables/${id}/activate`, { guests })),
    /** Only ids, quantities and notes are sent; the server takes names and prices from the menu. */
    order: async (id: string, items: OrderItem[], by: string) =>
        unwrap<Order>(
            await http.post(`/tables/${id}/order`, {
                by,
                items: items.map((i) => ({
                    foodId: i.foodId,
                    variantId: i.variantId ?? null,
                    qty: i.qty,
                    note: i.note ?? null,
                })),
            }),
        ),
    deactivate: async (id: string) => unwrap<DiningTable>(await http.post(`/tables/${id}/deactivate`)),
    moveGuests: async (id: string, to: string) =>
        unwrap<DiningTable>(await http.post(`/tables/${id}/move-guests`, { to })),
    clean: async (id: string) => unwrap<DiningTable>(await http.post(`/tables/${id}/clean`)),
    serveOrder: async (orderId: string) => unwrap<Order>(await http.patch(`/orders/${orderId}/serve`)),
    move: async (id: string, x: number, y: number) =>
        unwrap<DiningTable>(await http.patch(`/tables/${id}/position`, { x, y })),
    add: async (v: { name: string; seats: number; floor: string }) =>
        unwrap<DiningTable>(await http.post("/tables", v)),
    update: async (id: string, v: Partial<Pick<DiningTable, "name" | "seats" | "floor">>) =>
        unwrap<DiningTable>(await http.post(`/tables/${id}`, v)),
    remove: async (id: string) => {
        await http.delete(`/tables/${id}`);
    },
    addFloor: async (name: string) => unwrap<Floor>(await http.post("/floors", { name })),
    updateFloor: async (id: string, name: string) => unwrap<Floor>(await http.post(`/floors/${id}`, { name })),
    removeFloor: async (id: string) => {
        await http.delete(`/floors/${id}`);
    },
};
