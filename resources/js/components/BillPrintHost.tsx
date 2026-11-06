import { useEffect } from "react";
import { createPortal } from "react-dom";
import { aggregate, isTO, subtotal } from "@/lib/domain";
import { dt, peso, r2, sum, tm } from "@/lib/format";
import { usePayName, useTableName } from "@/lib/ordersHelpers";
import { usePrint } from "@/context/print";

/**
 * The printable bill. It lives in <body> (outside #root) and is hidden on screen; when printing, app.css hides #root and shows only this.
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
    const where = isTO(first) ? `Takeout ${first.pickup ?? ""}` : tName(first.table);
    const row = "flex justify-between gap-3";

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
            <div className="my-2 border-x-0 border-y border-dashed border-black py-1">
                <div className={row}>
                    <span>{where}</span>
                    <span>
                        {dt(Date.now())}, {tm(Date.now())}
                    </span>
                </div>
                <div>Order {codes}</div>
            </div>
            <ul className="m-0 list-none p-0">
                {aggregate(orders).map((i) => (
                    <li key={i.name} className={row}>
                        <span>
                            {i.qty} × {i.name}
                        </span>
                        <span>{peso(i.qty * i.price)}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-2 border-0 border-t border-dashed border-black pt-1">
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
                {paid && first.payment ? (
                    <div className={row}>
                        <span>Paid with</span>
                        <span>{payName(first.payment)}</span>
                    </div>
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
            </div>
            {!paid && job.payWith?.qr ? (
                <div className="mt-3 text-center">
                    <div className="font-bold">SCAN TO PAY WITH {job.payWith.name.toUpperCase()}</div>
                    <img
                        src={job.payWith.qr}
                        alt={`${job.payWith.name} QR code`}
                        className="mx-auto my-1 block h-[50mm] w-[50mm] object-contain"
                    />
                    {job.payWith.details ? <div>{job.payWith.details}</div> : null}
                    <div>Send exactly {peso(due)}, then show the reference no. to your waiter.</div>
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
