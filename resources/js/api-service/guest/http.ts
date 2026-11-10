/**
 * @file api-service/guest/http.ts
 * What the guest phone calls, against the Laravel backend. Same method names and shapes as ./mock.ts.
 */

// What the guest phone calls, against the Laravel backend. Same method names and shapes as ./guest.ts (the mock).
// Every call carries the table session's QR token (`k`): the one the phone joined with, or, in the staff preview, the table's current token.
import { http, unwrap } from "@/api-service/client";
import { clientRef, keys } from "@/hooks/useApi";
import { TO } from "@/lib/constants";
import { useUi } from "@/context/ui";
import type { DiningTable, Order, PlateLine } from "@/types/restaurant";

const joined = new Map<string, string>();

async function tokenFor(tableId: string): Promise<string> {
    if (tableId === TO) return "";
    const j = joined.get(tableId);
    if (j) return j;
    // A guest's phone must join with the table code first. Only the staff preview borrows the table's current token.
    if (useUi.getState().guestOnly) return "";
    const cached = clientRef.current?.getQueryData<DiningTable[]>(keys.tables)?.find((t) => t.id === tableId)?.token;
    if (cached) return cached;
    return unwrap<DiningTable[]>(await http.get("/tables")).find((t) => t.id === tableId)?.token ?? "";
}
const base = (tableId: string) => `/public/tables/${tableId}`;
const q = async (tableId: string) => ({ params: { k: await tokenFor(tableId) } });

export const guestHttp = {
    /** Opened from a table QR code: remember its token. A stale QR is reported by the first call that needs it (403). */
    join: async (tableId: string, token: string) => {
        try {
            await http.get(`${base(tableId)}/session`, { params: { k: token } });
            joined.set(tableId, token);
            return true;
        } catch {
            joined.delete(tableId);
            return false;
        }
    },
    /** The printed table QR has no token: the phone sends the code the waiter gave and gets the session token back. */
    enterCode: async (tableId: string, code: string) => {
        const { token } = unwrap<{ token: string }>(await http.post(`${base(tableId)}/join`, { code: code.trim() }));
        joined.set(tableId, token);
        return token;
    },
    plate: async (tableId: string) => unwrap<PlateLine[]>(await http.get(`${base(tableId)}/plate`, await q(tableId))),
    /** The backend has no demo takeout; the preview starts empty. */
    demoTakeoutId: async () => null as string | null,
    addLine: async (tableId: string, foodId: string, variantId: string | undefined, by: string) =>
        unwrap<{ name: string }>(
            await http.post(
                `${base(tableId)}/plate-lines`,
                { foodId, variantId: variantId ?? null, by },
                await q(tableId),
            ),
        ),
    changeQty: async (tableId: string, lineId: string, delta: number) => {
        await http.patch(`${base(tableId)}/plate-lines/${lineId}`, { delta }, await q(tableId));
    },
    setNote: async (tableId: string, lineId: string, note: string) => {
        await http.patch(`${base(tableId)}/plate-lines/${lineId}`, { note }, await q(tableId));
    },
    /** Sends the shared plate to the kitchen as the next round of the table's single order. */
    send: async (tableId: string, by: string) =>
        unwrap<Order>(await http.post(`${base(tableId)}/send`, { by }, await q(tableId))),
    billOut: async (tableId: string, method: string) =>
        unwrap<{ name: string; total: number }>(
            await http.post(`${base(tableId)}/bill-out`, { method }, await q(tableId)),
        ),
    placeTakeout: async (name: string, phone: string) =>
        unwrap<Order>(await http.post("/public/takeout", { name, phone })),
};
