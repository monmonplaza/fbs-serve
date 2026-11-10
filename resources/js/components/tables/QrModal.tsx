import { Icon } from "@/components/Icon";
import { QrCode } from "@/components/QrCode";
import { openModal, closeModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { useUi } from "@/context/ui";
import { useTables } from "@/hooks/useApi";
import type { DiningTable } from "@/types/restaurant";
import { appUrlIsLocal, guestLink } from "@/lib/guestLink";
import { printTableQrs } from "@/context/print";
import { openTableOrder } from "@/components/tables/TableOrderModal";

export function openGuestView(tableId: string) {
    const ui = useUi.getState();
    ui.setGuest({ table: tableId, tab: "menu" });
    ui.set({ mode: "guest" });
    closeModal();
    scrollTo(0, 0);
}

/** The table's printed QR (never changes) and the code for the group seated now. Also shown after seating a reservation. */
export function TableQr({ id }: { id: string }) {
    const t = useTables().data.find((x) => x.id === id);
    if (!t) return null;
    const link = guestLink(t);
    const active = !!t.token && !["inactive", "cleaning"].includes(t.status);
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
                {active && t.code ? (
                    <div className="qr-box" style={{ marginBottom: 12 }}>
                        <span className="label muted">Table code for these guests</span>
                        <b className="num" style={{ fontSize: 40, lineHeight: "48px", letterSpacing: "0.3em" }}>
                            {t.code}
                        </b>
                        <span className="caption muted">
                            Tell the guests this code, or type it on their phone. It changes every time the table is
                            activated.
                        </span>
                    </div>
                ) : (
                    <p className="caption muted" style={{ marginBottom: 12 }}>
                        {t.name} is not active. Activate it to get a table code for the guests.
                    </p>
                )}
                <div className="qr-box">
                    <QrCode text={link} label={`QR code for ${t.name}`} />
                    <b>Scan to order</b>
                    <span className="caption muted" style={{ wordBreak: "break-all", userSelect: "all" }}>
                        {link}
                    </span>
                </div>
                {appUrlIsLocal() ? (
                    <div className="alert warn" style={{ marginTop: 12 }}>
                        <Icon name="alert" />
                        <p>
                            APP_URL in .env is still a localhost address, so this QR uses the address in your browser.
                            Set APP_URL to the restaurant’s web address before you print the table QR codes.
                        </p>
                    </div>
                ) : null}
                <p className="caption muted">
                    This QR code belongs to {t.name} and never changes, so you can print it and leave it on the table.
                    No phone? Use <b>Take order</b> to enter their order yourself.
                </p>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Done
                </button>
                <button type="button" className="btn btn-outline" onClick={() => printTableQrs([t])}>
                    <Icon name="receipt" size={20} />
                    Print QR
                </button>
                <button type="button" className="btn btn-outline" onClick={copy}>
                    Copy link
                </button>
                {active ? (
                    <>
                        <button type="button" className="btn btn-outline" onClick={() => openGuestView(t.id)}>
                            <Icon name="phone" size={20} />
                            Open guest view
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => openTableOrder(t)}>
                            <Icon name="utensils" size={20} />
                            Take order
                        </button>
                    </>
                ) : null}
            </div>
        </>
    );
}

export function openQr(table: DiningTable) {
    openModal({ title: `${table.name} QR code`, content: <TableQr id={table.id} /> });
}
