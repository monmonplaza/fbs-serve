import { useState } from "react";
import { api, ApiError } from "@/api-service";
import { useFloors, useInvalidate, useTables } from "@/hooks/useApi";
import type { DiningTable } from "@/types/restaurant";
import { closeModal, openModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { Icon } from "@/components/Icon";

/** Guests who changed tables: pick a free table and their orders, plate and table code move with them. */
export const openMoveGuests = (t: DiningTable) =>
    openModal({ title: `Move guests from ${t.name}`, content: <MoveGuestsModal id={t.id} /> });

function MoveGuestsModal({ id }: { id: string }) {
    const tables = useTables().data,
        floors = useFloors().data;
    const from = tables.find((x) => x.id === id);
    const invalidate = useInvalidate();
    const [to, setTo] = useState("");
    const [busy, setBusy] = useState(false);
    if (!from) return null;
    const free = tables.filter((t) => t.status === "inactive");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!to || busy) return;
        setBusy(true);
        try {
            const t = await api.tables.moveGuests(from.id, to);
            await invalidate("tables", "orders", "plate", "reservations");
            closeModal();
            toast(`Guests moved from ${from.name} to ${t.name}. The table code stays ${t.code ?? "the same"}.`);
        } catch (err) {
            toast(err instanceof ApiError ? err.message : "Could not move the guests");
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit}>
            <div className="m-body">
                <p>
                    Their orders, plate and table code move to the new table, and {from.name} becomes free. The guests’
                    phones keep working and follow them to the new table.
                </p>
                {free.length ? (
                    <label className="field">
                        <span>New table</span>
                        <select className="input" value={to} onChange={(e) => setTo(e.target.value)} required autoFocus>
                            <option value="">Choose a free table</option>
                            {floors.map((f) => {
                                const here = free.filter((t) => t.floor === f.id);
                                return here.length ? (
                                    <optgroup key={f.id} label={f.name}>
                                        {here.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} · {t.seats} seats
                                            </option>
                                        ))}
                                    </optgroup>
                                ) : null;
                            })}
                        </select>
                    </label>
                ) : (
                    <div className="alert warn" role="alert">
                        <Icon name="alert" />
                        <p>No table is free right now.</p>
                    </div>
                )}
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary" disabled={!to || busy}>
                    <Icon name="table" size={20} />
                    Move guests
                </button>
            </div>
        </form>
    );
}
