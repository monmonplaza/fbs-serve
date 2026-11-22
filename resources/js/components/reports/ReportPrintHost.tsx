import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useReportPrint } from "@/context/print";
import { peso } from "@/lib/format";
import { pctChange, rangeText } from "@/lib/reportRanges";

const pct = (cur: number, prev: number) => {
    const c = pctChange(cur, prev);
    return c === null ? "new" : `${c > 0 ? "+" : ""}${c}%`;
};

function Section({ title, head, rows }: { title: string; head: string[]; rows: ReactNode[][] }) {
    if (!rows.length) return null;
    return (
        <section className="mt-4 break-inside-avoid">
            <h2 className="mb-1 text-[13px] font-bold">{title}</h2>
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        {head.map((h, i) => (
                            <th
                                key={h}
                                className={`border-b-2 border-black py-0.5 font-bold ${i ? "text-right" : "text-left"}`}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {r.map((c, k) => (
                                <td
                                    key={k}
                                    className={`border-b border-gray-300 py-0.5 ${k ? "text-right" : "text-left"}`}
                                >
                                    {c}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

/**
 * The printable sales report (also how it becomes a PDF: choose "Save as PDF" in the print dialog). Hidden on screen. Plain
 * tables, black on white, so it prints well on A4 and in black and white.
 */
export function ReportPrintHost() {
    const job = useReportPrint((s) => s.job);
    useEffect(() => {
        if (!job) return;
        const done = () => useReportPrint.setState({ job: null });
        window.addEventListener("afterprint", done, { once: true });
        const id = requestAnimationFrame(() => window.print());
        return () => {
            cancelAnimationFrame(id);
            window.removeEventListener("afterprint", done);
        };
    }, [job]);
    if (!job) return null;
    const { report: r, comparedWith } = job;
    const t = r.totals,
        p = r.previous;
    const share = (v: number, all: number) => (all ? `${Math.round((v / all) * 1000) / 10}%` : "—");
    const unit = r.range.group === "day" ? "Day" : r.range.group === "week" ? "Week" : "Month";

    return createPortal(
        <div
            id="report-print"
            className="hidden print:block bg-white p-4 text-[11px] leading-4 text-black"
            aria-hidden="true"
        >
            <h1 className="text-[20px] font-bold leading-6">FBS Serve · Sales report</h1>
            <p className="font-bold">{rangeText(r.range.from, r.range.to)}</p>
            <p>
                Counted on the day each order was paid. Compared with {comparedWith} ({rangeText(p.from, p.to)}).
                Printed {new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}.
            </p>
            <Section
                title="Summary"
                head={["", "This period", "Compared", "Change"]}
                rows={[
                    ["Net sales (VAT included)", peso(t.net), peso(p.net), pct(t.net, p.net)],
                    ["Orders", t.orders, p.orders, pct(t.orders, p.orders)],
                    ["Average order", peso(t.avgOrder), peso(p.avgOrder), pct(t.avgOrder, p.avgOrder)],
                    ["Guests", t.guests, p.guests, pct(t.guests, p.guests)],
                    ["Gross sales", peso(t.gross), peso(p.gross), pct(t.gross, p.gross)],
                    ["Discounts", peso(t.discounts), peso(p.discounts), pct(t.discounts, p.discounts)],
                    ["VATable sales", peso(t.vatable), peso(p.vatable), ""],
                    ["VAT (12%)", peso(t.vat), peso(p.vat), ""],
                    ["Items sold", t.itemsSold, p.itemsSold, pct(t.itemsSold, p.itemsSold)],
                ]}
            />
            {r.open.orders > 0 ? (
                <p className="mt-2">
                    Not paid yet, so not in the totals: {r.open.orders} {r.open.orders === 1 ? "order" : "orders"},{" "}
                    {peso(r.open.amount)} before any discount. They count on the day they are paid.
                </p>
            ) : null}
            <Section
                title={`By ${unit.toLowerCase()}`}
                head={[unit, "Orders", "Gross", "Discounts", "Net"]}
                rows={[
                    ...r.series.map((s) => [
                        rangeText(s.from, s.to),
                        s.orders,
                        peso(s.gross),
                        peso(s.discounts),
                        peso(s.net),
                    ]),
                    [
                        <b key="t">Total</b>,
                        <b key="o">{t.orders}</b>,
                        <b key="g">{peso(t.gross)}</b>,
                        <b key="d">{peso(t.discounts)}</b>,
                        <b key="n">{peso(t.net)}</b>,
                    ],
                ]}
            />
            <Section
                title="By payment method"
                head={["Method", "Payments", "Amount", "Share"]}
                rows={r.byPayment.map((x) => [x.name, x.count, peso(x.amount), share(x.amount, t.net)])}
            />
            <Section
                title="By channel"
                head={["Channel", "Orders", "Net", "Share"]}
                rows={r.byChannel.map((x) => [x.name, x.orders, peso(x.net), share(x.net, t.net)])}
            />
            <Section
                title="By category (before discounts)"
                head={["Category", "Quantity", "Sales"]}
                rows={r.byCategory.map((x) => [x.category, x.qty, peso(x.sales)])}
            />
            <Section
                title="Top dishes"
                head={["Dish", "Quantity", "Sales"]}
                rows={r.items.slice(0, 10).map((x) => [x.name, x.qty, peso(x.sales)])}
            />
            <Section
                title="By table"
                head={["Table", "Orders", "Guests", "Net"]}
                rows={r.byTable.slice(0, 10).map((x) => [x.table, x.orders, x.guests, peso(x.net)])}
            />
            <Section
                title="Discounts given"
                head={["Discount", "Percent", "Orders", "Amount"]}
                rows={r.discounts.map((x) => [x.name, `${x.pct}%`, x.orders, peso(x.amount)])}
            />
        </div>,
        document.body,
    );
}
