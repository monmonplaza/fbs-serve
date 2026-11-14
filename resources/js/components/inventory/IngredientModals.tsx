import { useState } from "react";
import { api, ApiError } from "@/api-service";
import { useInvalidate } from "@/hooks/useApi";
import type { Ingredient } from "@/types/restaurant";
import { closeModal, openModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { Icon } from "@/components/Icon";

/** The amount as people read it: no trailing zeros (1,250 g, 0.5 kg). */
export const qtyText = (n: number, unit: string) =>
    `${n.toLocaleString("en-PH", { maximumFractionDigits: 3 })} ${unit}`;

export const openIngredientForm = (i: Ingredient | null) =>
    openModal({ title: i ? `Edit ${i.name}` : "Add ingredient", content: <IngredientForm ingredient={i} /> });

function IngredientForm({ ingredient: i }: { ingredient: Ingredient | null }) {
    const invalidate = useInvalidate();
    const [v, setV] = useState({
        name: i?.name ?? "",
        unit: i?.unit ?? "g",
        onHand: "",
        reorderLevel: String(i?.reorderLevel ?? 0),
        cost: i?.cost == null ? "" : String(i.cost),
        active: i?.active ?? true,
    });
    const [busy, setBusy] = useState(false);
    const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setV((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
            await api.inventory.saveIngredient(i?.id ?? null, {
                name: v.name,
                unit: v.unit,
                onHand: i ? undefined : +v.onHand || 0,
                reorderLevel: +v.reorderLevel || 0,
                cost: v.cost === "" ? null : +v.cost,
                active: v.active,
            });
            await invalidate("ingredients", "movements");
            closeModal();
            toast(`${v.name.trim()} saved`);
        } catch (err) {
            toast(err instanceof ApiError ? err.message : "Could not save the ingredient");
            setBusy(false);
        }
    };

    return (
        <form onSubmit={save}>
            <div className="m-body">
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="field">
                        <span>Name</span>
                        <input
                            className="input"
                            value={v.name}
                            onChange={set("name")}
                            required
                            maxLength={255}
                            autoFocus
                        />
                    </label>
                    <label className="field">
                        <span>Unit</span>
                        <input
                            className="input"
                            value={v.unit}
                            onChange={set("unit")}
                            required
                            maxLength={12}
                            list="ingredient-units"
                        />
                        <datalist id="ingredient-units">
                            {["g", "kg", "ml", "L", "pc", "tray", "bottle"].map((u) => (
                                <option key={u} value={u} />
                            ))}
                        </datalist>
                        <span className="hint text-[12px]! leading-4!">Stock and recipes both use this unit.</span>
                    </label>
                    {i ? null : (
                        <label className="field">
                            <span>Stock on hand now</span>
                            <input
                                className="input num"
                                type="number"
                                min={0}
                                step="any"
                                value={v.onHand}
                                onChange={set("onHand")}
                            />
                            <span className="hint text-[12px]! leading-4!">
                                Later changes use Receive, Waste or Count.
                            </span>
                        </label>
                    )}
                    <label className="field">
                        <span>Reorder level</span>
                        <input
                            className="input num"
                            type="number"
                            min={0}
                            step="any"
                            value={v.reorderLevel}
                            onChange={set("reorderLevel")}
                        />
                        <span className="hint text-[12px]! leading-4!">
                            Low stock shows at or under this amount. 0 means no alert.
                        </span>
                    </label>
                    <label className="field">
                        <span>Cost per unit (₱, optional)</span>
                        <input
                            className="input num"
                            type="number"
                            min={0}
                            step="any"
                            value={v.cost}
                            onChange={set("cost")}
                        />
                    </label>
                </div>
                <label className="radio-card" style={{ marginTop: 12 }}>
                    <input type="checkbox" checked={v.active} onChange={set("active")} />
                    <span className="grow">
                        <b>In use</b>
                        <br />
                        <span className="caption muted">
                            Turn off for an ingredient you no longer buy. Its history stays.
                        </span>
                    </span>
                </label>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary" disabled={busy}>
                    {busy ? "Saving…" : "Save ingredient"}
                </button>
            </div>
        </form>
    );
}

type StockAction = "receive" | "waste" | "count";
const ACTIONS: Record<StockAction, { title: string; label: string; cta: string; hint: string; noteHint: string }> = {
    receive: {
        title: "Receive stock",
        label: "Amount received",
        cta: "Add to stock",
        hint: "A delivery or a transfer into storage.",
        noteHint: "Supplier, invoice no.",
    },
    waste: {
        title: "Record waste",
        label: "Amount lost",
        cta: "Remove from stock",
        hint: "Spoiled, spilled, dropped or given away.",
        noteHint: "What happened",
    },
    count: {
        title: "Count stock",
        label: "Amount counted",
        cta: "Set stock",
        hint: "What is physically there now. The difference is logged.",
        noteHint: "Optional",
    },
};

export const openStockAction = (kind: StockAction, i: Ingredient) =>
    openModal({ title: `${ACTIONS[kind].title}: ${i.name}`, content: <StockActionForm kind={kind} ingredient={i} /> });

function StockActionForm({ kind, ingredient: i }: { kind: StockAction; ingredient: Ingredient }) {
    const a = ACTIONS[kind];
    const invalidate = useInvalidate();
    const [qty, setQty] = useState(kind === "count" ? String(i.onHand) : "");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const n = +qty;
    const after = kind === "receive" ? i.onHand + n : kind === "waste" ? i.onHand - n : n;
    const valid = qty !== "" && (kind === "count" ? n >= 0 : n > 0);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy || !valid) return;
        setBusy(true);
        try {
            await api.inventory[kind](i.id, n, note);
            await invalidate("ingredients", "movements");
            closeModal();
            toast(`${i.name}: ${qtyText(after, i.unit)} on hand`);
        } catch (err) {
            toast(err instanceof ApiError ? err.message : "Could not save the change");
            setBusy(false);
        }
    };

    return (
        <form onSubmit={save}>
            <div className="m-body">
                <p className="caption muted">
                    {a.hint} Now: <b className="num">{qtyText(i.onHand, i.unit)}</b>
                </p>
                <label className="field">
                    <span>
                        {a.label} ({i.unit})
                    </span>
                    <input
                        className="input num"
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        required
                        autoFocus
                    />
                </label>
                <label className="field">
                    <span>Note</span>
                    <input
                        className="input"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={a.noteHint}
                        maxLength={255}
                    />
                </label>
                {valid ? (
                    <p className="caption muted" style={{ marginTop: 8 }}>
                        After this: <b className="num">{qtyText(after, i.unit)}</b>
                        {after < 0 ? " (below zero, check the amount)" : ""}
                    </p>
                ) : null}
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className={`btn ${kind === "waste" ? "btn-danger" : "btn-primary"}`} disabled={busy || !valid}>
                    <Icon name={kind === "count" ? "check" : kind === "waste" ? "trash" : "plus"} size={20} />
                    {a.cta}
                </button>
            </div>
        </form>
    );
}
