import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { aggregate, isTO, subtotal } from "@/lib/domain";
import { peso, r2, sum, tm } from "@/lib/format";
import { usePayName, useTableName } from "@/lib/ordersHelpers";
import { usePrint, type PrintJob } from "@/context/print";
import { VAT_RATE } from "@/lib/constants";
import { guestShares, hasBreakdown } from "@/lib/guestShares";

/**
 * The printable bill. It lives in <body> (outside the app) and is hidden on screen; when printing, app.css hides everything else in <body>.
 * 80 mm wide, so it suits a receipt printer and also prints fine on A4.
 */
/** The bill itself, 80 mm wide. `print` is the hidden copy the print dialog uses; otherwise it is the on-screen preview. */
export function BillSheet({ job, print = false }: { job: PrintJob; print?: boolean }) {
    const payName = usePayName(),
        tName = useTableName();
    const { orders, discount } = job;
    const first = orders[0],
        paid = !!job.guest || orders.every((o) => o.status === "paid");
    // One guest's own receipt: only their dishes, what they paid and how.
    const allPaid = orders.find((o) => o.guestPaid?.length)?.guestPaid ?? [];
    const mine = job.guest ? allPaid.filter((p) => p.guest === job.guest) : [];
    const mineShare = job.guest ? guestShares(orders).find((s) => s.key === job.guest) : undefined;
    const pct = discount?.pct ?? 0;
    const sub = mineShare ? r2(sum(mine.map((p) => p.gross))) : sum(orders.map(subtotal));
    // Guests who paid separately: the amount due is what they paid, each with their own method and discount.
    const gp = paid ? (allPaid.length ? allPaid : null) : null;
    const due = mineShare
        ? r2(sum(mine.map((p) => p.amount)))
        : gp
          ? r2(sum(gp.map((p) => p.amount)))
          : r2(sum(orders.map((o) => r2(subtotal(o) * (1 - pct / 100)))));
    const codes = [...new Set(orders.map((o) => o.code ?? o.id))].join(", ");
    const where = isTO(first) ? `Takeout ${first.pickup ?? ""}`.trim() : tName(first.table);
    // Menu prices include VAT, so the VAT part is taken out of the amount due.
    const vatable = r2(due / (1 + VAT_RATE)),
        vat = r2(due - vatable);
    const now = Date.now();
    const qr = job.payWith?.qr ? job.payWith : null;
    // Who ordered what: each guest's dishes and their part of the bill (after the discount), adding up to the amount due.
    const shares = guestShares(orders, gp ? 0 : pct);
    const shownDiscount = mineShare ? (mine.find((p) => p.discount)?.discount ?? null) : discount;
    const row = "flex justify-between gap-3";
    const rule = "my-2 border-0 border-t border-dashed border-black";

    return (
        <div
            id={print ? "bill-print" : undefined}
            className={
                (print ? "hidden print:block p-2 " : "p-4 ") +
                "mx-auto w-[80mm] bg-white font-mono text-[12px] leading-[16px] text-black"
            }
            aria-hidden={print ? "true" : undefined}
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
            {mineShare ? (
                <div className={row}>
                    <span>Guest</span>
                    <span className="font-bold">{mineShare.label}</span>
                </div>
            ) : null}
            <div className={row}>
                <span>Order no.</span>
                <span className="text-right">{codes}</span>
            </div>
            <div className={rule} />
            <ul className="m-0 list-none p-0">
                {(mineShare ? mineShare.lines : aggregate(orders)).map((i) => (
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
            {!mineShare && hasBreakdown(shares) ? (
                <>
                    <div className={rule} />
                    <div className="font-bold">PER GUEST</div>
                    {shares.map((s) => {
                        const mineP = gp?.filter((p) => p.guest === s.key) ?? [];
                        return (
                            <div key={s.key} className="mt-1 break-inside-avoid">
                                <div className={`${row} font-bold`}>
                                    <span>{s.label}</span>
                                    <span>{peso(gp ? sum(mineP.map((p) => p.amount)) : pct ? s.net : s.subtotal)}</span>
                                </div>
                                {s.lines.map((l) => (
                                    <div key={l.name} className={`${row} pl-2 text-[11px]`}>
                                        <span>
                                            {l.qty} × {l.name}
                                        </span>
                                        <span>{peso(l.amount)}</span>
                                    </div>
                                ))}
                                {gp ? (
                                    mineP.map((p, i) => (
                                        <div key={i} className="pl-2 text-[11px]">
                                            {p.discount
                                                ? `${peso(p.gross)} less ${p.discount.name} ${p.discount.pct}%. `
                                                : ""}
                                            Paid with {payName(p.method)}
                                            {p.ref ? ` (ref. ${p.ref})` : ""}
                                        </div>
                                    ))
                                ) : pct && discount ? (
                                    <div className="pl-2 text-[11px]">
                                        {peso(s.subtotal)} less {discount.name} {pct}%
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </>
            ) : null}
            <div className={rule} />
            <div className={row}>
                <span>Subtotal</span>
                <span>{peso(sub)}</span>
            </div>
            {shownDiscount ? (
                <div className={row}>
                    <span>
                        {shownDiscount.name}
                        {"amount" in shownDiscount && shownDiscount.amount != null ? "" : ` (${shownDiscount.pct}%)`}
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
            {mineShare ? (
                <>
                    <div className={rule} />
                    {mine.map((p, i) => (
                        <div key={i} className={row}>
                            <span>Paid with</span>
                            <span>
                                {payName(p.method)}
                                {p.ref ? ` (ref. ${p.ref})` : ""}
                            </span>
                        </div>
                    ))}
                </>
            ) : null}
            {paid && first.payment && !gp ? (
                <>
                    <div className={rule} />
                    <div className={row}>
                        <span>Paid with</span>
                        <span>{payName(first.payment)}</span>
                    </div>
                </>
            ) : null}
            {paid && !mineShare && first.payRef ? (
                <div className={row}>
                    <span>Ref. no.</span>
                    <span>{first.payRef}</span>
                </div>
            ) : null}
            {paid && !mineShare && first.received != null ? (
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
        </div>
    );
}

export function BillPrintHost() {
    const job = usePrint((s) => s.job);
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
    return createPortal(<BillSheet job={job} print />, document.body);
}

/** Shows the bill on screen first, so it can be checked (or kept) without a printer. Print then opens the print dialog. */
export function BillPreviewHost() {
    const preview = usePrint((s) => s.preview);
    const close = () => usePrint.setState({ preview: null });
    const ref = useRef<HTMLDialogElement>(null);
    // A native dialog goes in the top layer, so it shows above the app's own windows (which are dialogs too).
    useEffect(() => {
        const d = ref.current;
        if (preview && d && !d.open) d.showModal();
    }, [preview]);
    if (!preview || !preview.orders.length) return null;
    const paid = !!preview.guest || preview.orders.every((o) => o.status === "paid");
    return createPortal(
        <dialog
            ref={ref}
            className="print:hidden m-auto max-h-[92vh] w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-xl border-0 bg-transparent p-0 backdrop:bg-black/50"
            aria-label={paid ? "Receipt preview" : "Bill preview"}
            onClose={close}
            onCancel={close}
            onClick={(e) => e.target === e.currentTarget && close()}
        >
            <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xl bg-card text-ink shadow-xl">
                <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
                    <b>{paid ? "Receipt preview" : "Bill preview"}</b>
                </div>
                <div className="overflow-auto bg-sunken p-3">
                    <div className="shadow-md">
                        <BillSheet job={preview} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-hairline px-4 py-3">
                    <button className="btn btn-outline" onClick={close}>
                        Close
                    </button>
                    <button className="btn btn-primary" onClick={() => usePrint.setState({ job: preview })}>
                        Print
                    </button>
                </div>
            </div>
        </dialog>,
        document.body,
    );
}
