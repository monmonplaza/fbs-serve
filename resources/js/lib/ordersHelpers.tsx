import type { Order, TakeoutChannel } from "@/types/restaurant";
import { usePayments, useTables } from "@/hooks/useApi";
import { isTO } from "@/lib/domain";

export const CHAN: Record<TakeoutChannel, { l: string; c: string }> = {
    walkin: { l: "Walk-in", c: "var(--brand)" },
    grab: { l: "GrabFood", c: "#00B14F" },
    panda: { l: "Foodpanda", c: "#D70F64" },
};
export const chanOf = (o: Pick<Order, "channel">) => CHAN[o.channel ?? "walkin"] || CHAN.walkin;
export const isPlatform = (o: Pick<Order, "channel">) => o.channel === "grab" || o.channel === "panda";

export function ChTag({ o, extra = "" }: { o: Order; extra?: string }) {
    return (
        <span className={`chan ${extra}`.trim()}>
            <i style={{ background: chanOf(o).c }} />
            Takeout · {chanOf(o).l}
        </span>
    );
}

export const sod = (ts: number) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return +d;
};
export const takeoutLink = () => location.origin + "/guest#takeout";
export const isDineIn = (o: Order) => !isTO(o);

/** Payment method id to its display name (also for split bills and delivery platforms). */
export function usePayName() {
    const payments = usePayments().data;
    return (id?: string) =>
        id === "split"
            ? "Split bill"
            : id === "grab"
              ? "GrabFood (paid in app)"
              : id === "panda"
                ? "Foodpanda (paid in app)"
                : payments.find((p) => p.id === id)?.name || id || "";
}
export function useTableName() {
    const tables = useTables().data;
    return (id: string | null | undefined) => tables.find((t) => t.id === id)?.name || "Deleted table";
}
