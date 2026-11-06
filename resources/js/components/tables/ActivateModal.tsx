import { useState } from "react";
import { Icon } from "@/components/Icon";
import { api } from "@/api-service";
import { useInvalidate } from "@/hooks/useApi";
import { closeModal, openModal } from "@/context/modal";
import { toast } from "@/context/toast";
import type { DiningTable } from "@/types/restaurant";
import { openQr } from "@/components/tables/QrModal";

function ActivateForm({ table }: { table: DiningTable }) {
    const invalidate = useInvalidate();
    const [guests, setGuests] = useState(String(Math.min(2, table.seats)));
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const t = await api.tables.activate(table.id, Math.max(1, Math.min(99, Math.round(+guests) || 1)));
        await invalidate("tables", "plate");
        openQr(t);
        toast(`${t.name} is active. Show the QR code to the guests.`);
    };
    return (
        <form onSubmit={submit}>
            <div className="m-body">
                <p>
                    Activate this table after the guests sit down. Its QR code appears next, for the guests to scan and
                    order.
                </p>
                <label className="field">
                    <span>Number of guests</span>
                    <input
                        className="input num"
                        type="number"
                        min={1}
                        max={99}
                        inputMode="numeric"
                        required
                        autoFocus
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                    />
                    <span className="hint">
                        {table.name} has {table.seats} seats.
                    </span>
                </label>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary">
                    <Icon name="qr" size={20} />
                    Activate and show QR
                </button>
            </div>
        </form>
    );
}

export const openActivate = (table: DiningTable) =>
    openModal({ title: `Activate ${table.name}`, content: <ActivateForm table={table} /> });
