import type { SalesReport } from "@/types/restaurant";
import { rangeText } from "@/lib/reportRanges";

const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (...v: unknown[]) => v.map(cell).join(",");
const n = (v: number) => v.toFixed(2);

/** The whole sales report as one CSV: a section per table, amounts as plain numbers so a spreadsheet can add them. */
export function salesCsv(r: SalesReport, comparedWith: string): string {
    const t = r.totals,
        p = r.previous;
    const out: string[] = [
        line("Sales report"),
        line("Period", rangeText(r.range.from, r.range.to)),
        line("Counted on", "the day each order was paid"),
        line("Compared with", `${rangeText(p.from, p.to)} (${comparedWith})`),
        "",
        line("Summary", "This period", "Compared period"),
        line("Orders", t.orders, p.orders),
        line("Gross sales", n(t.gross), n(p.gross)),
        line("Discounts", n(t.discounts), n(p.discounts)),
        line("Net sales (VAT included)", n(t.net), n(p.net)),
        line("VATable sales", n(t.vatable), n(p.vatable)),
        line("VAT 12%", n(t.vat), n(p.vat)),
        line("Average order", n(t.avgOrder), n(p.avgOrder)),
        line("Guests", t.guests, p.guests),
        line("Items sold", t.itemsSold, p.itemsSold),
        "",
        line(`By ${r.range.group}`, "From", "To", "Orders", "Gross", "Discounts", "Net"),
        ...r.series.map((s) => line(s.key, s.from, s.to, s.orders, n(s.gross), n(s.discounts), n(s.net))),
        "",
        line("By hour", "Orders", "Net"),
        ...r.byHour
            .filter((h) => h.orders > 0)
            .map((h) => line(`${String(h.hour).padStart(2, "0")}:00`, h.orders, n(h.net))),
        "",
        line("By payment method", "Payments", "Amount"),
        ...r.byPayment.map((x) => line(x.name, x.count, n(x.amount))),
        "",
        line("By channel", "Orders", "Net"),
        ...r.byChannel.map((x) => line(x.name, x.orders, n(x.net))),
        "",
        line("By category (before discounts)", "Quantity", "Sales"),
        ...r.byCategory.map((x) => line(x.category, x.qty, n(x.sales))),
        "",
        line("Dishes (before discounts)", "Category", "Quantity", "Sales"),
        ...r.items.map((x) => line(x.name, x.category, x.qty, n(x.sales))),
        "",
        line("By table", "Floor", "Orders", "Guests", "Net"),
        ...r.byTable.map((x) => line(x.table, x.floor ?? "", x.orders, x.guests, n(x.net))),
        "",
        line("Discounts given", "Percent", "Orders", "Amount"),
        ...r.discounts.map((x) => line(x.name, x.pct, x.orders, n(x.amount))),
    ];
    return out.join("\r\n");
}

/** Downloads text as a file. The BOM lets Excel read the peso sign and other characters correctly. */
export function downloadCsv(filename: string, text: string) {
    const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const salesCsvName = (r: SalesReport) =>
    `sales-report-${r.range.from}${r.range.to === r.range.from ? "" : `_to_${r.range.to}`}.csv`;
