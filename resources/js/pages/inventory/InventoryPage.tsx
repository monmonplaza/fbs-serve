import { useState } from "react";
import { api } from "@/api-service";
import { useIngredients, useInvalidate, useMovements } from "@/hooks/useApi";
import type { Ingredient, StockMovement, StockMovementType } from "@/types/restaurant";
import { Icon } from "@/components/Icon";
import { usePaged } from "@/components/Pager";
import { RowActions } from "@/components/RowActions";
import { closeModal, openModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { dt, tm } from "@/lib/format";
import { openIngredientForm, openStockAction, qtyText } from "@/components/inventory/IngredientModals";

type Tab = "stock" | "movements";

const TYPE: Record<StockMovementType, { l: string; c: string }> = {
    received: { l: "Received", c: "p-ok" },
    used: { l: "Used", c: "p-neutral" },
    waste: { l: "Waste", c: "p-error" },
    count: { l: "Count", c: "p-info" },
};

export default function InventoryPage() {
    const [tab, setTab] = useState<Tab>("stock");
    const ingredients = useIngredients().data;
    const low = ingredients.filter((i) => i.active && i.low);
    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Inventory</h1>
                    <p className="muted">
                        Ingredient stock. It goes down when the kitchen sends an order out, using each dish’s recipe.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => openIngredientForm(null)}>
                    <Icon name="plus" size={20} />
                    Add Ingredient
                </button>
            </div>
            {low.length ? (
                <div className="alert warn" role="alert" style={{ marginBottom: 12 }}>
                    <Icon name="alert" />
                    <p>
                        <b>
                            {low.length} {low.length === 1 ? "ingredient is" : "ingredients are"} low or out:
                        </b>{" "}
                        {low
                            .slice(0, 6)
                            .map((i) => i.name)
                            .join(", ")}
                        {low.length > 6 ? ` and ${low.length - 6} more` : ""}
                    </p>
                </div>
            ) : null}
            <div className="tabs" role="tablist">
                {(
                    [
                        ["stock", "Stock"],
                        ["movements", "Movements"],
                    ] as const
                ).map(([k, l]) => (
                    <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                        {l}
                    </button>
                ))}
            </div>
            {tab === "stock" ? <StockTable ingredients={ingredients} /> : <MovementsTable />}
        </>
    );
}

function StockTable({ ingredients }: { ingredients: Ingredient[] }) {
    const invalidate = useInvalidate();
    const [q, setQ] = useState("");
    const [onlyLow, setOnlyLow] = useState(false);
    const rows = ingredients.filter(
        (i) => i.name.toLowerCase().includes(q.trim().toLowerCase()) && (!onlyLow || (i.active && i.low)),
    );
    const pg = usePaged(rows, q + onlyLow);

    const del = (i: Ingredient) =>
        openModal({
            title: `Delete ${i.name}?`,
            content: (
                <>
                    <div className="m-body">
                        <p>
                            <b>{i.name}</b> and its stock history will be deleted. An ingredient that is in a recipe
                            can’t be deleted.
                        </p>
                    </div>
                    <div className="m-foot">
                        <button className="btn btn-outline" onClick={closeModal}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={async () => {
                                try {
                                    await api.inventory.deleteIngredient(i.id);
                                    await invalidate("ingredients", "movements");
                                    closeModal();
                                    toast("Deleted");
                                } catch (e) {
                                    closeModal();
                                    toast(e instanceof Error ? e.message : "Could not delete");
                                }
                            }}
                        >
                            <Icon name="trash" size={20} />
                            Delete
                        </button>
                    </div>
                </>
            ),
        });

    return (
        <>
            <div className="toolbar">
                <input
                    className="input"
                    style={{ maxWidth: 280 }}
                    type="search"
                    placeholder="Search ingredients"
                    aria-label="Search ingredients"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <button className="chip" aria-pressed={onlyLow} onClick={() => setOnlyLow((x) => !x)}>
                    Low or out only
                </button>
            </div>
            <div className="tbl-scroll">
                <table className="data">
                    <thead>
                        <tr>
                            <th>Ingredient</th>
                            <th className="r">On hand</th>
                            <th className="r">Reorder level</th>
                            <th>Status</th>
                            <th className="r">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pg.rows.map((i) => (
                            <tr key={i.id} style={i.active ? undefined : { opacity: 0.6 }}>
                                <td>
                                    <b>{i.name}</b>
                                    {i.active ? null : <span className="caption muted"> · not in use</span>}
                                </td>
                                <td className="r num">{qtyText(i.onHand, i.unit)}</td>
                                <td className="r num">{i.reorderLevel > 0 ? qtyText(i.reorderLevel, i.unit) : "—"}</td>
                                <td>
                                    {i.onHand <= 0 ? (
                                        <span className="pill p-error">Out of stock</span>
                                    ) : i.low ? (
                                        <span className="pill p-warn">Low</span>
                                    ) : (
                                        <span className="pill p-ok">OK</span>
                                    )}
                                </td>
                                <td className="r" style={{ whiteSpace: "nowrap" }}>
                                    <RowActions
                                        actions={[
                                            {
                                                ic: "plus",
                                                label: "Receive",
                                                aria: `Receive ${i.name}`,
                                                onClick: () => openStockAction("receive", i),
                                            },
                                            {
                                                ic: "check",
                                                label: "Count",
                                                aria: `Count ${i.name}`,
                                                onClick: () => openStockAction("count", i),
                                            },
                                            {
                                                ic: "trash",
                                                label: "Record waste",
                                                aria: `Record waste of ${i.name}`,
                                                onClick: () => openStockAction("waste", i),
                                            },
                                            {
                                                ic: "edit",
                                                label: "Edit",
                                                aria: `Edit ${i.name}`,
                                                onClick: () => openIngredientForm(i),
                                            },
                                            {
                                                ic: "x",
                                                label: "Delete",
                                                aria: `Delete ${i.name}`,
                                                danger: true,
                                                onClick: () => del(i),
                                            },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                        {!pg.rows.length ? (
                            <tr>
                                <td colSpan={5}>
                                    <div className="empty">
                                        {ingredients.length
                                            ? "No ingredient matches."
                                            : "No ingredients yet. Add the first one, then give your dishes a recipe in Foods."}
                                    </div>
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
            {pg.bar}
        </>
    );
}

function MovementsTable() {
    const rows = useMovements().data;
    const pg = usePaged(rows);
    const sign = (m: StockMovement) => `${m.qty > 0 ? "+" : m.qty < 0 ? "−" : ""}${qtyText(Math.abs(m.qty), m.unit)}`;
    return (
        <>
            <div className="tbl-scroll">
                <table className="data">
                    <thead>
                        <tr>
                            <th>When</th>
                            <th>Ingredient</th>
                            <th>Type</th>
                            <th className="r">Change</th>
                            <th className="r">Balance</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pg.rows.map((m) => (
                            <tr key={m.id}>
                                <td className="num" style={{ whiteSpace: "nowrap" }}>
                                    {dt(m.at)}, {tm(m.at)}
                                </td>
                                <td>
                                    <b>{m.ingredient}</b>
                                </td>
                                <td>
                                    <span className={`pill ${TYPE[m.type].c}`}>{TYPE[m.type].l}</span>
                                </td>
                                <td className="r num">{sign(m)}</td>
                                <td className="r num">{qtyText(m.balance, m.unit)}</td>
                                <td className="caption muted">
                                    {[m.ref ? `Order ${m.ref}` : "", m.note ?? "", m.by ? `by ${m.by}` : ""]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </td>
                            </tr>
                        ))}
                        {!pg.rows.length ? (
                            <tr>
                                <td colSpan={6}>
                                    <div className="empty">No stock changes yet.</div>
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
            {pg.bar}
        </>
    );
}
