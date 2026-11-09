import { useState } from "react";
import { api, ApiError } from "@/api-service";
import { useFoods, useInvalidate, useTables, useUsers } from "@/hooks/useApi";
import type { DiningTable } from "@/types/restaurant";
import { useUi } from "@/context/ui";
import { closeModal, openModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { orderEta } from "@/lib/domain";
import { peso, sum } from "@/lib/format";
import { FoodPicker, draftItems, type Draft } from "@/components/orders/FoodPicker";

/** For guests without a phone: staff pick the food and send it to the kitchen for this table. */
export const openTableOrder = (t: DiningTable) =>
    openModal({ title: `Take order for ${t.name}`, wide: true, content: <TableOrderModal id={t.id} /> });

function TableOrderModal({ id }: { id: string }) {
    const t = useTables().data.find((x) => x.id === id);
    const foods = useFoods().data;
    const meId = useUi((s) => s.meId);
    const me = useUsers().data.find((u) => u.id === meId);
    const invalidate = useInvalidate();
    const [draft, setDraft] = useState<Draft>({});
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    if (!t) return null;

    const items = draftItems(draft, foods);
    const n = sum(items.map((i) => i.qty)),
        tot = sum(items.map((i) => i.price * i.qty));

    const send = async () => {
        setBusy(true);
        try {
            const kitchenNote = note.trim();
            const o = await api.tables.order(
                t.id,
                kitchenNote ? items.map((i) => ({ ...i, note: kitchenNote })) : items,
                me?.name ?? "Staff",
            );
            await invalidate("orders", "tables");
            closeModal();
            toast(`${o.code ?? o.id} for ${t.name} sent to the kitchen`);
        } catch (e) {
            toast(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
            setBusy(false);
        }
    };

    return (
        <>
            <div className="m-body">
                <FoodPicker
                    foods={foods}
                    draft={draft}
                    setDraft={setDraft}
                    side={
                        <>
                            <div>
                                <b>{t.name}</b>
                                <div className="caption muted">
                                    {t.guests ? `${t.guests} guests · ` : ""}For guests without a phone
                                </div>
                            </div>
                            <label className="field">
                                <span>Note for the kitchen (optional)</span>
                                <input
                                    className="input"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Less spicy, no onion"
                                    autoComplete="off"
                                    maxLength={120}
                                />
                                <span className="hint">Applies to every dish in this order.</span>
                            </label>
                            <b>Order</b>
                            {n ? (
                                <>
                                    <ul className="items">
                                        {items.map((i, k) => (
                                            <li key={k}>
                                                <b className="num">{i.qty}×</b>
                                                <span>{i.name}</span>
                                                <span className="num">{peso(i.price * i.qty)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="sum">
                                        <div className="total">
                                            <span>Total</span>
                                            <span className="num">{peso(tot)}</span>
                                        </div>
                                    </div>
                                    <span className="caption muted num">
                                        Ready in about {orderEta(items, foods)} min · paid with the table bill
                                    </span>
                                </>
                            ) : (
                                <p className="caption muted">No food yet. Pick from the tabs.</p>
                            )}
                        </>
                    }
                />
            </div>
            <div className="m-foot to-foot">
                <span className="grow caption muted num">
                    {n ? `${n} items · ${peso(tot)}` : "Add food to start the order."}
                </span>
                <button className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary" disabled={!n || busy} onClick={send}>
                    Send to kitchen{n ? " · " + peso(tot) : ""}
                </button>
            </div>
        </>
    );
}
