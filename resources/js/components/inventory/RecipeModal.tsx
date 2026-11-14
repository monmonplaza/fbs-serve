import { useEffect, useState } from "react";
import { api, ApiError } from "@/api-service";
import { useIngredients, useInvalidate } from "@/hooks/useApi";
import type { Food, RecipeLine } from "@/types/restaurant";
import { closeModal, openModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { Icon } from "@/components/Icon";

/** What goes into one portion of the dish. Stock leaves by this recipe when the kitchen sends an order out. */
export const openRecipe = (f: Food) =>
    openModal({ title: `Recipe: ${f.name}`, wide: true, content: <RecipeForm food={f} /> });

type Row = { ingredientId: string; variantId: string; qty: string };

function RecipeForm({ food }: { food: Food }) {
    const ingredients = useIngredients().data;
    const invalidate = useInvalidate();
    const [rows, setRows] = useState<Row[] | null>(null);
    const [busy, setBusy] = useState(false);
    const sizes = food.variants ?? [];

    useEffect(() => {
        api.inventory.recipe(food.id).then((lines: RecipeLine[]) =>
            setRows(
                lines.map((l) => ({
                    ingredientId: l.ingredientId,
                    variantId: l.variantId ?? "",
                    qty: String(l.qty),
                })),
            ),
        );
    }, [food.id]);

    if (!rows) return <div className="m-body caption muted">Loading…</div>;
    const set = (i: number, p: Partial<Row>) => setRows((r) => r!.map((x, k) => (k === i ? { ...x, ...p } : x)));
    const unit = (id: string) => ingredients.find((x) => x.id === id)?.unit ?? "";
    const usable = ingredients.filter((i) => i.active);
    const valid = rows.every((r) => r.ingredientId && +r.qty > 0);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy || !valid) return;
        setBusy(true);
        try {
            await api.inventory.saveRecipe(
                food.id,
                rows.map((r) => ({ ingredientId: r.ingredientId, variantId: r.variantId || null, qty: +r.qty })),
            );
            await invalidate("ingredients");
            closeModal();
            toast(rows.length ? `${food.name} recipe saved` : `${food.name} is no longer tracked`);
        } catch (err) {
            toast(err instanceof ApiError ? err.message : "Could not save the recipe");
            setBusy(false);
        }
    };

    return (
        <form onSubmit={save}>
            <div className="m-body">
                <p className="caption muted">
                    Amount of each ingredient in <b>one portion</b>.{" "}
                    {sizes.length ? "Pick a size when an amount only applies to it. " : ""}A dish with no ingredients
                    isn’t tracked.
                </p>
                {rows.length ? (
                    <div className="grid gap-2" style={{ marginTop: 12 }}>
                        {rows.map((r, i) => (
                            <div
                                key={i}
                                className="grid items-end gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
                            >
                                <label className="field">
                                    <span className={i ? "sr-only" : undefined}>Ingredient</span>
                                    <select
                                        className="input"
                                        value={r.ingredientId}
                                        onChange={(e) => set(i, { ingredientId: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose…</option>
                                        {usable.map((x) => (
                                            <option key={x.id} value={x.id}>
                                                {x.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="field">
                                    <span className={i ? "sr-only" : undefined}>Amount per portion</span>
                                    <span className="flex items-center gap-2">
                                        <input
                                            className="input num"
                                            type="number"
                                            min={0}
                                            step="any"
                                            inputMode="decimal"
                                            value={r.qty}
                                            onChange={(e) => set(i, { qty: e.target.value })}
                                            required
                                        />
                                        <span className="caption muted min-w-8">{unit(r.ingredientId)}</span>
                                    </span>
                                </label>
                                {sizes.length ? (
                                    <label className="field">
                                        <span className={i ? "sr-only" : undefined}>Size</span>
                                        <select
                                            className="input"
                                            value={r.variantId}
                                            onChange={(e) => set(i, { variantId: e.target.value })}
                                        >
                                            <option value="">All sizes</option>
                                            {sizes.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.name} only
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                ) : (
                                    <span />
                                )}
                                <button
                                    type="button"
                                    className="icon-btn danger"
                                    aria-label="Remove this ingredient"
                                    onClick={() => setRows((x) => x!.filter((_, k) => k !== i))}
                                >
                                    <Icon name="trash" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="empty">No ingredients yet. This dish isn’t tracked.</p>
                )}
                <button
                    type="button"
                    className="btn btn-outline"
                    style={{ marginTop: 12 }}
                    onClick={() => setRows((r) => [...r!, { ingredientId: "", variantId: "", qty: "" }])}
                    disabled={!usable.length}
                >
                    <Icon name="plus" size={20} />
                    Add ingredient
                </button>
                {usable.length ? null : <p className="caption muted">Add ingredients in Inventory first.</p>}
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary" disabled={busy || !valid}>
                    {busy ? "Saving…" : "Save recipe"}
                </button>
            </div>
        </form>
    );
}
