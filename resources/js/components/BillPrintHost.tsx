import { useEffect } from "react";
import { createPortal } from "react-dom";
import { aggregate, isTO, subtotal } from "@/lib/domain";
import { peso, r2, sum, tm } from "@/lib/format";
import { usePayName, useTableName } from "@/lib/ordersHelpers";
import { usePrint } from "@/context/print";
import { VAT_RATE } from "@/lib/constants";

/**
 * The printable bill. It lives in <body> (outside the app) and is hidden on screen; when printing, app.css hides everything else in <body>.
 * 80 mm wide, so it suits a receipt printer and also prints fine on A4.
 */
export function BillPrintHost() {
    const job = usePrint((s) => s.job);
    const payName = usePayName(),
        tName = useTableName();

    useEffect(() => {
        if (!job) return;
        const done = () => usePrint.setState({ job: null });
        window.addEventListener("afterprint", done, { once: true });
        // Wait one frame (and the QR image) so the bill is complete before the print dialog snapshots the page.
        let id = 0,
            live = true;
        const go = () => {
            if (live) id = requestAnimationFrame(() => window.print());
        };
        const qr = job.payWith?.qr;
        if (qr) {
            const im = new Image();
            im.src = qr;
            im.decode().then(go, go);
        } else go();
        return () => {
            live = false;
            cancelAnimationFrame(id);
            window.removeEventListener("afterprint", done);
        };
    }, [job]);

    if (!job || !job.orders.length) return null;
    const { orders, discount } = job;
    const first = orders[0],
        paid = orders.every((o) => o.status === "paid");
    const pct = discount?.pct ?? 0;
    const sub = sum(orders.map(subtotal));
    const due = r2(sum(orders.map((o) => r2(subtotal(o) * (1 - pct / 100)))));
    const codes = [...new Set(orders.map((o) => o.code ?? o.id))].join(", ");
    const where = isTO(first) ? `Takeout ${first.pickup ?? ""}`.trim() : tName(first.table);
    // Menu prices include VAT, so the VAT part is taken out of the amount due.
    const vatable = r2(due / (1 + VAT_RATE)),
        vat = r2(due - vatable);
    const now = Date.now();
    const qr = job.payWith?.qr ? job.payWith : null;
    const row = "flex justify-between gap-3";
    const rule = "my-2 border-0 border-t border-dashed border-black";

    return createPortal(
        <div
            id="bill-print"
            className="hidden print:block mx-auto w-[80mm] bg-white p-2 font-mono text-[12px] leading-[16px] text-black"
            aria-hidden="true"
        >
            <div className="text-center">
                <div className="text-[16px] font-bold">FBS Serve</div>
                <div>{paid ? "RECEIPT" : "BILL"}</div>
            </div>
            <div className={rule} />
            <div className={row}>
                <span>{isTO(first) ? "Order" : "Table"}</span>
                <span className="font-bold">{where}</span>
            </div>
            <div className={row}>
                <span>Date</span>
                <span>
                    {new Date(now).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                </span>
            </div>
            <div className={row}>
                <span>Time</span>
                <span>{tm(now)}</span>
            </div>
            <div className={row}>
                <span>Order no.</span>
                <span className="text-right">{codes}</span>
            </div>
            <div className={rule} />
            <ul className="m-0 list-none p-0">
                {aggregate(orders).map((i) => (
                    <li key={i.name} className="mb-1">
                        <div className={row}>
                            <span>
                                {i.qty} × {i.name}
                            </span>
                            <span>{peso(i.qty * i.price)}</span>
                        </div>
                        {i.qty > 1 ? <div className="pl-4 text-[11px]">@ {peso(i.price)} each</div> : null}
                    </li>
                ))}
            </ul>
            <div className={rule} />
            <div className={row}>
                <span>Subtotal</span>
                <span>{peso(sub)}</span>
            </div>
            {discount ? (
                <div className={row}>
                    <span>
                        {discount.name} ({discount.pct}%)
                    </span>
                    <span>−{peso(r2(sub - due))}</span>
                </div>
            ) : null}
            <div className={`${row} text-[14px] font-bold`}>
                <span>{paid ? "TOTAL" : "AMOUNT DUE"}</span>
                <span>{peso(due)}</span>
            </div>
            <div className="text-[11px]">Prices include VAT.</div>
            <div className={row}>
                <span>VATable sales</span>
                <span>{peso(vatable)}</span>
            </div>
            <div className={row}>
                <span>VAT ({Math.round(VAT_RATE * 100)}%)</span>
                <span>{peso(vat)}</span>
            </div>
            {paid && first.payment ? (
                <>
                    <div className={rule} />
                    <div className={row}>
                        <span>Paid with</span>
                        <span>{payName(first.payment)}</span>
                    </div>
                </>
            ) : null}
            {paid && first.payRef ? (
                <div className={row}>
                    <span>Ref. no.</span>
                    <span>{first.payRef}</span>
                </div>
            ) : null}
            {paid && first.received != null ? (
                <>
                    <div className={row}>
                        <span>Amount received</span>
                        <span>{peso(first.received)}</span>
                    </div>
                    <div className={row}>
                        <span>Change</span>
                        <span>{peso(first.change ?? 0)}</span>
                    </div>
                </>
            ) : null}
            {qr ? (
                <div className="mt-3 text-center">
                    <div className="font-bold">
                        {paid ? `PAID WITH ${qr.name.toUpperCase()}` : `SCAN TO PAY WITH ${qr.name.toUpperCase()}`}
                    </div>
                    <img
                        src={qr.qr}
                        alt={`${qr.name} QR code`}
                        className="mx-auto my-1 block h-[50mm] w-[50mm] object-contain"
                    />
                    {qr.details ? <div>{qr.details}</div> : null}
                    {paid ? null : <div>Send exactly {peso(due)}, then show the reference no. to your waiter.</div>}
                </div>
            ) : null}
            <p className="mt-3 text-center">
                {paid ? "Thank you for dining with us!" : "Please pay at the counter or to your waiter."}
            </p>
            <p className="mt-1 text-center text-[10px]">This is not an official receipt.</p>
        </div>,
        document.body,
    );
}
