import type { DiningTable } from "@/types/restaurant";

/** The link the table QR code opens: the guest phone for that table and session. */
export const guestLink = (t: Pick<DiningTable, "id" | "token">) =>
    location.origin + "/guest#t=" + encodeURIComponent(t.id) + "&k=" + t.token;
