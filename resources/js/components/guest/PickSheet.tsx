import { useState, type FormEvent } from "react";
import type { Food } from "@/types/restaurant";
import { Icon } from "@/components/Icon";
import { EtaTag } from "@/lib/foodDisplay";
import { peso } from "@/lib/format";
import { LOW_STOCK, soldOut } from "@/lib/domain";

/** Variant picker, a bottom sheet inside the phone frame. */
export function PickSheet({
    food,
    onClose,
    onAdd,
}: {
    food: Food;
    onClose: () => void;
    onAdd: (variantId: string) => void;
}) {
    const vs = food.variants ?? [];
    const firstOpen = vs.find((x) => !soldOut(food, x.id))?.id;
    const [v, setV] = useState(firstOpen ?? "");
    // A size that sold out while the sheet was open can't stay selected.
    const sel = vs.some((x) => x.id === v && !soldOut(food, x.id)) ? v : firstOpen;
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (sel) onAdd(sel);
    };
    return (
        <div className="g-sheet-wrap">
            <button className="g-scrim" tabIndex={-1} aria-label="Close" onClick={onClose} />
            <form
                className="g-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={`Choose an option for ${food.name}`}
                onSubmit={submit}
                onKeyDown={(e) => {
                    if (e.key === "Escape") onClose();
                }}
            >
                <div className="g-sheet-head">
                    <div className="grow">
                        <h3>{food.name}</h3>
                        <p className="caption muted">Choose one</p>
                    </div>
                    <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>
                {vs.map((x) => {
                    const out = soldOut(food, x.id);
                    return (
                        <label key={x.id} className="radio-card" style={out ? { opacity: 0.6 } : undefined}>
                            <input
                                type="radio"
                                name="variant"
                                value={x.id}
                                checked={x.id === sel}
                                disabled={out}
                                onChange={() => setV(x.id)}
                            />
                            <span className="grow">
                                <b>{x.name}</b>
                                {out ? (
                                    <span className="pill p-error" style={{ marginLeft: 8 }}>
                                        Sold out
                                    </span>
                                ) : x.left !== undefined && x.left <= LOW_STOCK ? (
                                    <span className="caption num" style={{ marginLeft: 8 }}>
                                        Only {x.left} left
                                    </span>
                                ) : null}
                            </span>
                            <b className="num">{peso(x.price)}</b>
                        </label>
                    );
                })}
                <EtaTag food={food} />
                <button className="btn btn-primary block" disabled={!sel}>
                    <Icon name="plus" size={20} />
                    Add to plate
                </button>
            </form>
        </div>
    );
}
