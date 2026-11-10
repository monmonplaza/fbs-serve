import { useEffect } from "react";
import { createPortal } from "react-dom";
import { QrCode } from "@/components/QrCode";
import { useQrPrint } from "@/context/print";
import { guestLink } from "@/lib/guestLink";

/**
 * Printable table QR cards, hidden on screen. Each card holds the table's fixed QR code; guests then type the 4-digit
 * code the waiter gives them. Two cards per row on A4.
 */
export function QrPrintHost() {
    const tables = useQrPrint((s) => s.tables);
    useEffect(() => {
        if (!tables) return;
        const done = () => useQrPrint.setState({ tables: null });
        window.addEventListener("afterprint", done, { once: true });
        const id = requestAnimationFrame(() => window.print());
        return () => {
            cancelAnimationFrame(id);
            window.removeEventListener("afterprint", done);
        };
    }, [tables]);
    if (!tables?.length) return null;
    return createPortal(
        <div id="qr-print" className="hidden print:grid grid-cols-2 gap-6 bg-white p-4 text-black" aria-hidden="true">
            {tables.map((t) => (
                <div
                    key={t.id}
                    className="flex break-inside-avoid flex-col items-center gap-2 rounded-xl border-2 border-black p-5 text-center"
                >
                    <div className="text-[14px] font-semibold tracking-wide">FBS Serve</div>
                    <div className="text-[28px] leading-8 font-bold">{t.name}</div>
                    <div className="w-[55mm]">
                        <QrCode text={guestLink(t)} label={`QR code for ${t.name}`} />
                    </div>
                    <div className="text-[16px] font-bold">Scan to see the menu and order</div>
                    <div className="text-[13px]">Then enter the 4-digit table code from your waiter.</div>
                </div>
            ))}
        </div>,
        document.body,
    );
}
