/**
 * @file api-service/reservations/http.ts
 * Reservations against the Laravel backend. Same method names and shapes as ./mock.ts.
 */

import { http, unwrap } from "@/api-service/client";
import type { ReservationInput } from "@/api-service/reservations/mock";
import type { DiningTable, Reservation } from "@/types/restaurant";

/** The advance order only needs ids and quantities; the server takes names and prices from the menu. */
const body = (v: ReservationInput) => ({
    ...v,
    order: v.order?.length
        ? v.order.map((i) => ({ foodId: i.foodId, variantId: i.variantId ?? null, qty: i.qty }))
        : null,
});

export const reservationsHttp = {
    list: async () => unwrap<Reservation[]>(await http.get("/reservations")),
    create: async (v: ReservationInput) => unwrap<Reservation>(await http.post("/reservations", body(v))),
    update: async (id: string, v: ReservationInput) =>
        unwrap<Reservation>(await http.post(`/reservations/${id}`, body(v))),
    /** Reschedule to another date, time or table. */
    move: async (id: string, at: number, tableId: string | null, reason: string) =>
        unwrap<Reservation>(await http.patch(`/reservations/${id}/move`, { at, tableId, reason })),
    /** Dragging a booked reservation to another calendar day keeps its time. */
    moveToDay: async (id: string, day: number) =>
        unwrap<Reservation>(await http.patch(`/reservations/${id}/move-day`, { day })),
    cancel: async (id: string, reason: string) =>
        unwrap<Reservation>(await http.patch(`/reservations/${id}/cancel`, { reason })),
    noShow: async (id: string) => unwrap<Reservation>(await http.patch(`/reservations/${id}/no-show`)),
    restore: async (id: string) => unwrap<Reservation>(await http.patch(`/reservations/${id}/restore`)),
    remove: async (id: string) => {
        await http.delete(`/reservations/${id}`);
    },

    dismiss: async (id: string) => {
        await http.patch(`/reservations/${id}/dismiss`);
    },
    /** Seats a booked reservation: activates the table and puts the advance order on its plate. */
    seat: async (id: string, tableId: string) =>
        unwrap<{ reservation: Reservation; table: DiningTable }>(
            await http.post(`/reservations/${id}/seat`, { tableId }),
        ),
};
