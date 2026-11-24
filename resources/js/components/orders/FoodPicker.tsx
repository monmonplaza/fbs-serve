import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { useCategories } from "@/hooks/useApi";
import type { Food, OrderItem, Variant } from "@/types/restaurant";
import { FoodImage } from "@/lib/foodDisplay";
import { hasV, itemName, LOW_STOCK, soldOut, stockLeft, unitPrice } from "@/lib/domain";
import { peso } from "@/lib/format";

/** Picked quantities. The key is the food id, or "foodId|variantId" for a food with variants. */
export type Draft = Record<string, number>;

/** The picked food as order lines, with menu names and prices. */
export const draftItems = (draft: Draft, foods: Food[]): OrderItem[] =>
    Object.entries(draft)
        .filter(([, q]) => q > 0)
        .flatMap(([k, qty]) => {
            const [fid, vid] = k.split("|"),
                f = foods.find((x) => x.id === fid);
            return f ? [{ foodId: fid, variantId: vid, name: itemName(f, vid), price: unitPrice(f, vid), qty }] : [];
        });

/** Staff food picker by category tab, with a side panel (customer details, order summary) next to it. */
export function FoodPicker({
    foods,
    draft,
    setDraft,
    side,
}: {
    foods: Food[];
    draft: Draft;
    setDraft: (fn: (d: Draft) => Draft) => void;
    side: ReactNode;
}) {
    const categories = useCategories().data;
    const [cat, setCat] = useState("all");
    const [pick, setPick] = useState<string | null>(null);
    const cats = categories.filter((c) => foods.some((f) => f.cat === c.id && f.status === "available"));
    const avail = (c: string) => foods.filter((f) => f.cat === c && f.status === "available");
    const qty = (k: string, d: number) => setDraft((x) => ({ ...x, [k]: Math.max(0, (x[k] || 0) + d) }));
    const scrollTop = () => document.getElementById("modal")?.scrollTo(0, 0);

    /** The Add button, or the quantity stepper once the dish (or size) is picked. */
    const control = (f: Food, v?: Variant) => {
        const k = v ? f.id + "|" + v.id : f.id,
            nm = v ? `${f.name} (${v.name})` : f.name,
            q = draft[k],
            left = stockLeft(f, v?.id),
            out = left !== undefined && left <= 0,
            // Staff cannot pick more than is left. The server makes the final check for dishes that share an ingredient.
            full = left !== undefined && (q || 0) >= left;
        return q ? (
            <div className="stepper" style={{ alignSelf: "flex-start" }}>
                <button type="button" aria-label={`Remove one ${nm}`} onClick={() => qty(k, -1)}>
                    <Icon name={q > 1 ? "minus" : "trash"} size={18} />
                </button>
                <span className="num">{q}</span>
                <button
                    type="button"
                    aria-label={`Add one ${nm}`}
                    disabled={full}
                    title={full ? `Only ${left} left` : undefined}
                    onClick={() => qty(k, 1)}
                >
                    <Icon name="plus" size={18} />
                </button>
            </div>
        ) : (
            <button
                type="button"
                className="btn btn-outline"
                aria-label={`Add ${nm}`}
                disabled={out}
                onClick={() => qty(k, 1)}
            >
                <Icon name="plus" size={18} />
                Add
            </button>
        );
    };
    const stockNote = (left: number | undefined) =>
        left !== undefined && left <= 0 ? (
            <span className="pill p-error">Sold out</span>
        ) : left !== undefined && left <= LOW_STOCK ? (
            <span className="caption num" style={{ color: "var(--warning)" }}>
                Only {left} left
            </span>
        ) : null;

    /** A dish without sizes is one card. A dish with sizes is one card too; its sizes are picked in a small window. */
    const card = (f: Food) => {
        if (hasV(f)) {
            const picked = f.variants.reduce((n, v) => n + (draft[f.id + "|" + v.id] || 0), 0),
                out = f.variants.every((v) => soldOut(f, v.id)),
                from = Math.min(...f.variants.map((v) => v.price));
            return (
                <div key={f.id} className={`to-food ${picked ? "on" : ""}`} style={out ? { opacity: 0.6 } : undefined}>
                    <div className="to-head">
                        <div className="to-thumb">
                            <FoodImage food={f} size={24} />
                        </div>
                        <div className="min-w-0">
                            <b>{f.name}</b>
                            <div className="caption muted num">
                                From {peso(from)} · {f.eta} min
                            </div>
                            <span className="caption muted">{f.variants.length} sizes</span>
                            {out ? <span className="pill p-error"> Sold out</span> : null}
                        </div>
                    </div>
                    <button
                        type="button"
                        className={`btn ${picked ? "btn-primary" : "btn-outline"}`}
                        aria-label={`Choose a size of ${f.name}`}
                        disabled={out}
                        onClick={() => setPick(f.id)}
                    >
                        {picked ? `Edit · ${picked} picked` : "Choose size"}
                    </button>
                </div>
            );
        }
        const k = f.id,
            q = draft[k],
            left = stockLeft(f),
            out = left !== undefined && left <= 0;
        return (
            <div key={k} className={`to-food ${q ? "on" : ""}`} style={out ? { opacity: 0.6 } : undefined}>
                <div className="to-head">
                    <div className="to-thumb">
                        <FoodImage food={f} size={24} />
                    </div>
                    <div className="min-w-0">
                        <b>{f.name}</b>
                        <div className="caption muted num">
                            {peso(f.price)} · {f.eta} min
                        </div>
                        {stockNote(left)}
                    </div>
                </div>
                {control(f)}
            </div>
        );
    };
    const picking = foods.find((f) => f.id === pick && hasV(f));

    return (
        <>
            <div className="tabs to-tabs" role="tablist" aria-label="Food category">
                {[["all", "All"], ...cats.map((c) => [c.id, c.name])].map(([k, l]) => (
                    <button
                        key={k}
                        type="button"
                        className="tab"
                        role="tab"
                        aria-selected={cat === k}
                        onClick={() => {
                            setCat(k);
                            scrollTop();
                        }}
                    >
                        {l}
                    </button>
                ))}
            </div>
            <div className="to-grid">
                <div className="to-foods">
                    {cat === "all"
                        ? cats.map((c) => (
                              <Fragment key={c.id}>
                                  <span className="label muted to-cat">{c.name}</span>
                                  {avail(c.id).map(card)}
                              </Fragment>
                          ))
                        : avail(cat).map(card)}
                </div>
                <aside className="to-side">{side}</aside>
            </div>
            <SizeDialog
                food={picking}
                onClose={() => setPick(null)}
                draft={draft}
                control={control}
                stockNote={stockNote}
            />
        </>
    );
}

/** The sizes of one dish, with a quantity for each. A native dialog, so it opens on top of the order window. */
function SizeDialog({
    food,
    onClose,
    draft,
    control,
    stockNote,
}: {
    food?: Food;
    onClose: () => void;
    draft: Draft;
    control: (f: Food, v?: Variant) => ReactNode;
    stockNote: (left: number | undefined) => ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (food && !d.open) d.showModal();
        else if (!food && d.open) d.close();
    }, [food]);
    const picked = food?.variants?.reduce((n, v) => n + (draft[food.id + "|" + v.id] || 0), 0) ?? 0;
    return (
        <dialog
            ref={ref}
            aria-label={food ? `Choose a size of ${food.name}` : "Choose a size"}
            style={{ width: "min(420px, calc(100% - 32px))" }}
            // React passes a close event up to the parent window's own handler, which would close the order window too.
            onClose={(e) => {
                e.stopPropagation();
                onClose();
            }}
            onCancel={(e) => e.stopPropagation()}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {food ? (
                <>
                    <div className="m-body">
                        <div className="to-head" style={{ alignItems: "center" }}>
                            <div className="to-thumb">
                                <FoodImage food={food} size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>{food.name}</h3>
                                <span className="caption muted">Pick a size and how many.</span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            {food.variants!.map((v) => (
                                <div
                                    key={v.id}
                                    className={`to-food ${draft[food.id + "|" + v.id] ? "on" : ""}`}
                                    style={{ flexDirection: "row", alignItems: "center" }}
                                >
                                    <div>
                                        <b>{v.name}</b>
                                        <div className="caption muted num">{peso(v.price)}</div>
                                        {stockNote(stockLeft(food, v.id))}
                                    </div>
                                    {control(food, v)}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="m-foot">
                        <button type="button" className="btn btn-primary" onClick={onClose}>
                            {picked ? `Done · ${picked} picked` : "Done"}
                        </button>
                    </div>
                </>
            ) : null}
        </dialog>
    );
}
