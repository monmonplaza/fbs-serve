/**
 * @file api-service/orders/http.ts
 * Orders and payments against the Laravel backend. Same method names and return shapes as ./mock.ts.
 */

import { http, unwrap } from "@/api-service/client";
import type { DiningTable, Order, OrderItem, Payment, TakeoutChannel } from "@/types/restaurant";

const payBody = (discountId: string | null, pays: Payment[]) => ({ discountId, pays });

export const ordersHttp = {
    /** One entry per round (send to the kitchen). Rounds of one table session share `code` and `session`, so they are one bill. */
    list: async () => unwrap<Order[]>(await http.get("/orders")),
    payTable: async (tableId: string, discountId: string | null, pays: Payment[]) =>
        unwrap<{ table: DiningTable }>(await http.post(`/tables/${tableId}/pay`, payBody(discountId, pays))),
    payBill: async (orderId: string, discountId: string | null, pays: Payment[]) =>
        unwrap<{ count: number; payment: string; table: DiningTable | null }>(
            await http.post(`/orders/${orderId}/pay`, payBody(discountId, pays)),
        ),
    payPickup: async (orderId: string, discountId: string | null, pays: Payment[]) =>
        unwrap<Order>(await http.post(`/orders/${orderId}/pickup`, payBody(discountId, pays))),
    handover: async (orderId: string) => unwrap<Order>(await http.post(`/orders/${orderId}/handover`)),
    /** Name and price are looked up by the server; only the food, variant, quantity and note are sent. */
    placeTakeout: async (items: OrderItem[], customer: string, phone: string, channel: TakeoutChannel, ref: string) =>
        unwrap<Order>(
            await http.post("/takeout", {
                items: items.map((i) => ({
                    foodId: i.foodId,
                    variantId: i.variantId ?? null,
                    qty: i.qty,
                    note: i.note ?? null,
                })),
                customer,
                phone,
                channel,
                ref,
            }),
        ),
};
