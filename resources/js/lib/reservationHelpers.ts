import { create } from "zustand";
import type { Reservation, ReservationStatus, OrderItem, Food } from "@/types/restaurant";
import type { StatusMeta } from "@/lib/constants";
import { tm, sum } from "@/lib/format";
import { itemName, unitPrice } from "@/lib/domain";

export const sod = (ts: number) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return +d;
};
const pad2 = (n: number) => String(n).padStart(2, "0");
export const ymd = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
export const hm = (ts: number) => {
    const d = new Date(ts);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
export const parseAt = (date: string, time: string) => (date && time ? +new Date(date + "T" + time) : NaN);
export const addDays = (ts: number, n: number) => {
    const d = new Date(ts);
    d.setDate(d.getDate() + n);
    return +d;
};
export const weekStart = (ts: number) => addDays(sod(ts), -((new Date(ts).getDay() + 6) % 7));
export const fullDay = (ts: number) =>
    new Date(ts).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });
export const tmc = (ts: number) => tm(ts).replace(" AM", "a").replace(" PM", "p");
export const whenText = (ts: number) =>
    `${new Date(ts).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}, ${tm(ts)}`;

export const RSTAT: Record<ReservationStatus, StatusMeta> = {
    booked: { l: "Booked", c: "reserved", i: "calendar" },
    arrived: { l: "Arrived", c: "ok", i: "check" },
    cancelled: { l: "Cancelled", c: "neutral", i: "x" },
    noshow: { l: "No-show", c: "error", i: "user" },
};
export const resTotal = (r: Pick<Reservation, "order">) => sum((r.order || []).map((i) => i.price * i.qty));

/** Advance-order draft: quantity per `foodId` or `foodId|variantId`. */
export type OrderDraft = Record<string, number>;
export const draftKey = (i: Pick<OrderItem, "foodId" | "variantId">) =>
    i.variantId ? i.foodId + "|" + i.variantId : i.foodId;
export const draftItems = (d: OrderDraft, foods: Food[]): OrderItem[] =>
    Object.entries(d)
        .filter(([, q]) => q > 0)
        .flatMap(([k, qty]) => {
            const [fid, vid] = k.split("|"),
                f = foods.find((x) => x.id === fid);
            return f ? [{ foodId: fid, variantId: vid, name: itemName(f, vid), price: unitPrice(f, vid), qty }] : [];
        });

/** Calendar view state, kept across screens like the prototype's S.resView and friends. */
interface ResUi {
    view: "month" | "week" | "list";
    day: number;
    status: "all" | ReservationStatus;
    range: "upcoming" | "past" | "all";
    q: string;
    set: (p: Partial<Omit<ResUi, "set">>) => void;
}
export const useResUi = create<ResUi>((set) => ({
    view: "month",
    day: sod(Date.now()),
    status: "all",
    range: "upcoming",
    q: "",
    set: (p) => set(p),
}));

export interface ResDraft {
    id: string;
    name: string;
    phone: string;
    pax: string;
    date: string;
    time: string;
    tableId: string;
    note: string;
    adv: boolean;
}
/** The form draft survives the trip to the advance-order picker and back. */
interface DraftStore {
    draft: ResDraft;
    order: OrderDraft;
    cat: string;
    setDraft: (p: Partial<ResDraft>) => void;
    setOrder: (o: OrderDraft) => void;
    setCat: (c: string) => void;
    reset: (d: ResDraft, o: OrderDraft) => void;
}
export const useDraft = create<DraftStore>((set) => ({
    draft: { id: "", name: "", phone: "", pax: "2", date: "", time: "", tableId: "", note: "", adv: false },
    order: {},
    cat: "all",
    setDraft: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
    setOrder: (order) => set({ order }),
    setCat: (cat) => set({ cat }),
    reset: (draft, order) => set({ draft, order, cat: "all" }),
}));

export function initDraft(r: Reservation | null, dayTs?: number) {
    const { reset } = useDraft.getState();
    if (r) {
        const o: OrderDraft = {};
        (r.order || []).forEach((i) => {
            o[draftKey(i)] = i.qty;
        });
        reset(
            {
                id: r.id,
                name: r.name,
                phone: r.phone || "",
                pax: String(r.pax),
                date: ymd(r.at),
                time: hm(r.at),
                tableId: r.tableId || "",
                note: r.note || "",
                adv: !!r.order?.length,
            },
            o,
        );
        return;
    }
    const day = dayTs ? sod(+dayTs) : sod(Date.now()),
        step = 30 * 60000;
    reset(
        {
            id: "",
            name: "",
            phone: "",
            pax: "2",
            date: ymd(day),
            time: day === sod(Date.now()) ? hm(Math.ceil((Date.now() + step) / step) * step) : "19:00",
            tableId: "",
            note: "",
            adv: false,
        },
        {},
    );
}
