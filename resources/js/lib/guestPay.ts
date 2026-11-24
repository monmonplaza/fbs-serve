import type { GuestPaid, Order } from "@/types/restaurant";
import { guestShares, type GuestShare } from "@/lib/guestShares";
import { r2, sum } from "@/lib/format";

/** One guest's standing on a bill that is paid guest by guest. */
export interface GuestDue {
    share: GuestShare;
    /** Their dishes not paid for yet, before any discount (what the next payment covers). */
    remaining: number;
    /** What they already paid. */
    paid: GuestPaid[];
}

/** Every guest of a bill with what is left to pay. Several rounds of one order carry the same `guestPaid` list. */
export function guestDues(orders: Order[]): GuestDue[] {
    const paid = orders.find((o) => o.guestPaid?.length)?.guestPaid ?? [];
    return guestShares(orders).map((share) => {
        const mine = paid.filter((p) => p.guest === share.key);
        return { share, paid: mine, remaining: r2(share.subtotal - sum(mine.map((p) => p.gross))) };
    });
}
