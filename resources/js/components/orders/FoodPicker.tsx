import { Fragment, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { useCategories } from "@/hooks/useApi";
import type { Food, OrderItem, Variant } from "@/types/restaurant";
import { hasV, itemName, unitPrice } from "@/lib/domain";
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
    const cats = categories.filter((c) => foods.some((f) => f.cat === c.id && f.status === "available"));
    const avail = (c: string) => foods.filter((f) => f.cat === c && f.status === "available");
    const qty = (k: string, d: number) => setDraft((x) => ({ ...x, [k]: Math.max(0, (x[k] || 0) + d) }));
    const scrollTop = () => document.getElementById("modal")?.scrollTo(0, 0);

    const card = (f: Food, v?: Variant) => {
        const k = v ? f.id + "|" + v.id : f.id,
            nm = v ? `${f.name} (${v.name})` : f.name,
            q = draft[k];
        return (
            <div key={k} className={`to-food ${q ? "on" : ""}`}>
                <div>
                    <b>{f.name}</b>
                    {v ? (
                        <span className="vchip" style={{ marginLeft: 6 }}>
                            {v.name}
                        </span>
                    ) : null}
                    <div className="caption muted num">
                        {peso(v ? v.price : f.price)} · {f.eta} min
                    </div>
                </div>
                {q ? (
                    <div className="stepper" style={{ alignSelf: "flex-start" }}>
                        <button type="button" aria-label={`Remove one ${nm}`} onClick={() => qty(k, -1)}>
                            <Icon name={q > 1 ? "minus" : "trash"} size={18} />
                        </button>
                        <span className="num">{q}</span>
                        <button type="button" aria-label={`Add one ${nm}`} onClick={() => qty(k, 1)}>
                            <Icon name="plus" size={18} />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="btn btn-outline"
                        aria-label={`Add ${nm}`}
                        onClick={() => qty(k, 1)}
                    >
                        <Icon name="plus" size={18} />
                        Add
                    </button>
                )}
            </div>
        );
    };
    const cards = (f: Food) => (hasV(f) ? f.variants.map((v) => card(f, v)) : card(f));

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
                                  {avail(c.id).map(cards)}
                              </Fragment>
                          ))
                        : avail(cat).map(cards)}
                </div>
                <aside className="to-side">{side}</aside>
            </div>
        </>
    );
}
