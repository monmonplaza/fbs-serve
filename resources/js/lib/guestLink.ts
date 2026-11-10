import type { DiningTable } from "@/types/restaurant";

/**
 * The link on a table's printed QR code. It holds only the table, so it never changes: guests type the table code from
 * the waiter to join the group that is seated now.
 */
export const guestLink = (t: Pick<DiningTable, "id">) => publicBase() + "/guest#t=" + encodeURIComponent(t.id);

/** The Takeout QR's link (put it at the counter or the entrance). */
export const takeoutLink = () => publicBase() + "/guest#takeout";

let appUrl = "";
/** Set once at boot from the server's APP_URL (an Inertia shared prop). */
export const setAppUrl = (url: unknown) => {
    appUrl = typeof url === "string" ? url.replace(/\/+$/, "") : "";
};
/** True while APP_URL is still a localhost address, which a guest's phone cannot open. */
export const appUrlIsLocal = () => !appUrl || /^https?:\/\/(localhost|127\.|\[::1\])/i.test(appUrl);
/**
 * Where QR codes point: APP_URL from .env, so printed codes keep working whatever address the staff use. While APP_URL
 * is still localhost (development), the address in the browser bar is used instead so phones on the Wi-Fi can open it.
 */
export const publicBase = () => (appUrlIsLocal() ? location.origin : appUrl);

/** A new 4-digit table code (mock backend only; the Laravel backend makes its own). */
export const newTableCode = () => String(Math.floor(Math.random() * 10000)).padStart(4, "0");

/** The session token a phone joined with, kept per table so a reload does not ask for the code again. */
const keyName = (tableId: string) => "fbs-table-key:" + tableId;
export const savedKey = (tableId: string): string | null => {
    try {
        return localStorage.getItem(keyName(tableId));
    } catch {
        return null;
    }
};
export const saveKey = (tableId: string, token: string | null) => {
    try {
        if (token) localStorage.setItem(keyName(tableId), token);
        else localStorage.removeItem(keyName(tableId));
    } catch {
        /* private mode: the guest types the code again after a reload */
    }
};
