import { useEffect } from "react";
import { useUi } from "@/context/ui";
import { useReservations } from "@/hooks/useApi";
import { useNow } from "@/hooks/useNow";
import { tm } from "@/lib/format";
import { dueReservations } from "@/lib/reservations";

const notified = new Set<string>();

/** One bell entry per reservation when its reminder window opens. */
export function useReservationNotices() {
    const list = useReservations().data;
    const now = useNow(15000);

    useEffect(() => {
        dueReservations(list, now).forEach((r) => {
            if (notified.has(r.id)) {
                return;
            }

            notified.add(r.id);
            useUi
                .getState()
                .notify("calendar", `Reservation at ${tm(r.at)}: ${r.name}, ${r.pax} guests`, "reservations");
        });
    }, [list, now]);
}
