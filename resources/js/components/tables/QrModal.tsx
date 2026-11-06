import { Icon } from "@/components/Icon";
import { QrCode } from "@/components/QrCode";
import { openModal, closeModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { useUi } from "@/context/ui";
import { useTables } from "@/hooks/useApi";
import type { DiningTable } from "@/types/restaurant";
import { guestLink } from "@/lib/guestLink";

export function openGuestView(tableId: string) {
    const ui = useUi.getState();
    ui.setGuest({ table: tableId, tab: "menu" });
    ui.set({ mode: "guest" });
    closeModal();
    scrollTo(0, 0);
}

function QrBody({ id }: { id: string }) {
    const t = useTables().data.find((x) => x.id === id);
    if (!t || !t.token)
        return (
            <div className="m-body">
                <p>This table has no active QR code.</p>
            </div>
        );
    const link = guestLink(t);
    const copy = () => {
        const p = navigator.clipboard?.writeText(link);
        if (p)
            p.then(
                () => toast("Link copied"),
                () => toast("Select the link above and copy it"),
            );
        else toast("Select the link above and copy it");
    };
    return (
        <>
            <div className="m-body">
                <div className="qr-box">
                    <QrCode text={link} />
                    <b>Scan to order</b>
                    <span className="caption muted" style={{ wordBreak: "break-all", userSelect: "all" }}>
                        {link}
                    </span>
                </div>
                <p className="caption muted">
                    Every guest at {t.name} scans this same code. It stops working once the table is marked clean.
                </p>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Done
                </button>
                <button type="button" className="btn btn-outline" onClick={copy}>
                    Copy link
                </button>
                <button type="button" className="btn btn-primary" onClick={() => openGuestView(t.id)}>
                    <Icon name="phone" size={20} />
                    Open guest view
                </button>
            </div>
        </>
    );
}

export function openQr(table: DiningTable) {
    openModal({ title: `${table.name} QR code`, content: <QrBody id={table.id} /> });
}
