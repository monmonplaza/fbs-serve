import { useMemo, useState, type ReactNode } from "react";
import { ApiError } from "@/api-service";
import { useFoods, useSalesReport } from "@/hooks/useApi";
import type { ReportGroup, SalesReport } from "@/types/restaurant";
import { Icon } from "@/components/Icon";
import { BarChart, type Bar } from "@/components/reports/BarChart";
import { printSalesReport } from "@/context/print";
import { peso } from "@/lib/format";
import { downloadCsv, salesCsv, salesCsvName } from "@/lib/reportCsv";
import {
    PRESETS,
    compareLabel,
    dayText,
    parseYmd,
    pctChange,
    presetRange,
    rangeText,
    ymd,
    type Preset,
} from "@/lib/reportRanges";
import { hourLabel, shortHour } from "@/lib/salesStats";

const GROUPS: [ReportGroup | "auto", string][] = [
    ["auto", "Automatic"],
    ["day", "Day"],
    ["week", "Week"],
    ["month", "Month"],
];

/** Reports for managers and the owner: sales for any day, week or month, with the comparison, charts, tables and export. */
export default function ReportsPage() {
    const [preset, setPreset] = useState<Preset>("week");
    const [custom, setCustom] = useState(() => {
        const t = ymd(new Date());
        return { from: t, to: t };
    });
    const [group, setGroup] = useState<ReportGroup | "auto">("auto");

    const range = useMemo(
        () => (preset === "custom" ? { from: custom.from, to: custom.to } : presetRange(preset)),
        [preset, custom],
    );
    const days = Math.round((+parseYmd(range.to) - +parseYmd(range.from)) / 86400000) + 1;
    const problem =
        !range.from || !range.to
            ? "Pick both dates."
            : days < 1
              ? "The end date must be the same as or after the start date."
              : days > 366
                ? "Pick a range of 366 days or fewer."
                : "";
    const q = useSalesReport({ ...range, group }, !problem);
    const r = q.data;
    const comparedWith = compareLabel(preset);

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Reports</h1>
                    <p className="muted">Sales for any day, week or month. A sale is counted on the day it was paid.</p>
                </div>
                <button
                    className="btn btn-outline"
                    disabled={!r || !!problem}
                    onClick={() => r && downloadCsv(salesCsvName(r), salesCsv(r, comparedWith))}
                >
                    <Icon name="list" size={20} />
                    CSV
                </button>
                <button
                    className="btn btn-outline"
                    disabled={!r || !!problem}
                    onClick={() => r && printSalesReport(r, comparedWith)}
                >
                    <Icon name="receipt" size={20} />
                    PDF
                </button>
            </div>

            <div className="toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
                <div className="chips" role="group" aria-label="Period">
                    {PRESETS.map(([k, l]) => (
                        <button key={k} className="chip" aria-pressed={preset === k} onClick={() => setPreset(k)}>
                            {l}
                        </button>
                    ))}
                </div>
                {preset === "custom" ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            className="input"
                            type="date"
                            aria-label="From"
                            value={custom.from}
                            max={custom.to || undefined}
                            onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                            style={{ width: "auto" }}
                        />
                        <span className="muted">to</span>
                        <input
                            className="input"
                            type="date"
                            aria-label="To"
                            value={custom.to}
                            min={custom.from || undefined}
                            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                            style={{ width: "auto" }}
                        />
                    </div>
                ) : null}
                <label className="flex items-center gap-2 caption muted" style={{ marginLeft: "auto" }}>
                    Group by
                    <select
                        className="input"
                        value={group}
                        onChange={(e) => setGroup(e.target.value as ReportGroup | "auto")}
                        style={{ width: "auto", minHeight: 36 }}
                    >
                        {GROUPS.map(([k, l]) => (
                            <option key={k} value={k}>
                                {l}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {problem ? (
                <div className="alert warn" role="alert">
                    <Icon name="alert" />
                    <p>{problem}</p>
                </div>
            ) : q.isError ? (
                <div className="alert warn" role="alert">
                    <Icon name="alert" />
                    <p>
                        {q.error instanceof ApiError ? q.error.message : "Could not load the report."}{" "}
                        <button className="btn btn-outline" onClick={() => q.refetch()}>
                            Try again
                        </button>
                    </p>
                </div>
            ) : !r ? (
                <p className="muted">Loading the report…</p>
            ) : (
                <ReportBody r={r} comparedWith={comparedWith} updating={q.isFetching} />
            )}
        </>
    );
}

function Delta({ cur, prev, money = true }: { cur: number; prev: number; money?: boolean }) {
    const c = pctChange(cur, prev);
    const was = money ? peso(prev) : prev.toLocaleString("en-PH");
    if (c === null) return <span className="caption muted num">New: {was} before</span>;
    const color = c > 0 ? "var(--success)" : c < 0 ? "var(--error)" : "var(--ink-muted)";
    return (
        <span className="caption num">
            <b style={{ color }}>
                {c > 0 ? "▲" : c < 0 ? "▼" : "•"} {Math.abs(c)}%
            </b>{" "}
            <span className="muted">vs {was}</span>
        </span>
    );
}

function Kpi({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
    return (
        <div className="card tile">
            <Icon name={icon} />
            <span className="label muted">{label}</span>
            {children}
        </div>
    );
}

/** A small table in a card. The first column is text; the others are numbers. */
function Table({
    title,
    note,
    head,
    rows,
    foot,
    empty = "Nothing in this period.",
}: {
    title: string;
    note?: string;
    head: string[];
    rows: ReactNode[][];
    foot?: ReactNode[];
    empty?: string;
}) {
    return (
        <section className="card">
            <div className="card-head">
                <h3>{title}</h3>
                {note ? <span className="caption muted">{note}</span> : null}
            </div>
            <div className="tbl-scroll">
                <table className="data compact">
                    <thead>
                        <tr>
                            {head.map((h, i) => (
                                <th key={h} className={i ? "r" : undefined}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i}>
                                {row.map((c, k) => (
                                    <td key={k} className={k ? "r num" : undefined}>
                                        {k ? c : <b>{c}</b>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {!rows.length ? (
                            <tr>
                                <td colSpan={head.length}>
                                    <div className="empty">{empty}</div>
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                    {foot && rows.length ? (
                        <tfoot>
                            <tr>
                                {foot.map((c, k) => (
                                    <td key={k} className={k ? "r num" : undefined}>
                                        <b>{c}</b>
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    ) : null}
                </table>
            </div>
        </section>
    );
}

const share = (v: number, all: number) => (all ? `${Math.round((v / all) * 1000) / 10}%` : "—");

function ReportBody({ r, comparedWith, updating }: { r: SalesReport; comparedWith: string; updating: boolean }) {
    const t = r.totals,
        p = r.previous;
    const menu = useFoods().data;
    const unit = r.range.group === "day" ? "Day" : r.range.group === "week" ? "Week" : "Month";

    const trend: Bar[] = r.series.map((s) => ({
        key: s.key,
        label:
            r.range.group === "month"
                ? new Date(`${s.key}-01T00:00:00`).toLocaleDateString("en-PH", { month: "short" })
                : dayText(s.from),
        value: s.net,
        tip: (
            <>
                <b>{rangeText(s.from, s.to)}</b>
                <span className="num">{peso(s.net)}</span>
                <span className="muted">
                    {s.orders} {s.orders === 1 ? "order" : "orders"}
                    {s.discounts > 0 ? ` · ${peso(s.discounts)} discounts` : ""}
                </span>
            </>
        ),
    }));
    const withSales = r.byHour.filter((h) => h.orders > 0).map((h) => h.hour);
    const lo = Math.min(6, ...withSales),
        hi = Math.max(22, ...withSales);
    const hours: Bar[] = r.byHour
        .filter((h) => h.hour >= lo && h.hour <= hi)
        .map((h) => ({
            key: String(h.hour),
            label: shortHour(h.hour),
            value: h.net,
            tip: (
                <>
                    <b>
                        {hourLabel(h.hour)} – {hourLabel((h.hour + 1) % 24)}
                    </b>
                    <span className="num">{peso(h.net)}</span>
                    <span className="muted">
                        {h.orders} {h.orders === 1 ? "order" : "orders"}
                    </span>
                </>
            ),
        }));
    const busiest = r.byHour.reduce((b, h) => (h.net > b.net ? h : b), r.byHour[0]);
    const sold = new Set(r.items.map((i) => i.name.replace(/ \(.*\)$/, "")));
    const unsold = menu.filter((f) => f.status === "available" && !sold.has(f.name));
    const slow = [...r.items].sort((a, b) => a.qty - b.qty || a.sales - b.sales).slice(0, 5);

    return (
        <div
            className="grid gap-4"
            style={{ opacity: updating ? 0.6 : 1, transition: "opacity .15s" }}
            aria-busy={updating}
        >
            <p className="caption muted">
                <b>{rangeText(r.range.from, r.range.to)}</b> · compared with {comparedWith} ({rangeText(p.from, p.to)})
                {updating ? " · updating…" : ""}
            </p>

            <div className="tiles">
                <Kpi icon="cash" label="Net Sales">
                    <span className="val money num">{peso(t.net)}</span>
                    <Delta cur={t.net} prev={p.net} />
                </Kpi>
                <Kpi icon="receipt" label="Orders">
                    <span className="val num">{t.orders}</span>
                    <Delta cur={t.orders} prev={p.orders} money={false} />
                </Kpi>
                <Kpi icon="wallet" label="Average Order">
                    <span className="val money num">{peso(t.avgOrder)}</span>
                    <Delta cur={t.avgOrder} prev={p.avgOrder} />
                </Kpi>
                <Kpi icon="user" label="Guests">
                    <span className="val num">{t.guests}</span>
                    <Delta cur={t.guests} prev={p.guests} money={false} />
                </Kpi>
            </div>
            <div className="tiles">
                <Kpi icon="list" label="Gross Sales">
                    <span className="val money num">{peso(t.gross)}</span>
                    <span className="caption muted">before discounts</span>
                </Kpi>
                <Kpi icon="sparkle" label="Discounts">
                    <span className="val money num">{peso(t.discounts)}</span>
                    <span className="caption muted">{share(t.discounts, t.gross)} of gross</span>
                </Kpi>
                <Kpi icon="book" label="VAT Included">
                    <span className="val money num">{peso(t.vat)}</span>
                    <span className="caption muted num">12% of {peso(t.vatable)}</span>
                </Kpi>
                <Kpi icon="utensils" label="Items Sold">
                    <span className="val num">{t.itemsSold}</span>
                    <Delta cur={t.itemsSold} prev={p.itemsSold} money={false} />
                </Kpi>
            </div>

            {t.orders === 0 ? (
                <div className="card">
                    <div className="empty">
                        <Icon name="receipt" size={32} />
                        No paid orders in this period. Sales appear on the day the bill is paid.
                    </div>
                </div>
            ) : null}

            <div className="two">
                <section className="card">
                    <div className="card-head">
                        <div>
                            <h3>Sales by {unit}</h3>
                            <span className="caption muted">Net sales, VAT included</span>
                        </div>
                    </div>
                    <BarChart bars={trend} ariaLabel={`Net sales by ${unit.toLowerCase()}`} />
                </section>
                <section className="card">
                    <div className="card-head">
                        <div>
                            <h3>Sales by Hour</h3>
                            <span className="caption muted">
                                {t.orders
                                    ? `Busiest: ${hourLabel(busiest.hour)} (${peso(busiest.net)})`
                                    : "Hour of payment"}
                            </span>
                        </div>
                    </div>
                    <BarChart bars={hours} ariaLabel="Net sales by hour of the day" />
                </section>
            </div>

            <div className="rpt-grid">
                <Table
                    title="By Payment Method"
                    head={["Method", "Payments", "Amount", "Share"]}
                    rows={r.byPayment.map((x) => [x.name, x.count, peso(x.amount), share(x.amount, t.net)])}
                />
                <Table
                    title="By Channel"
                    head={["Channel", "Orders", "Net", "Share"]}
                    rows={r.byChannel.map((x) => [x.name, x.orders, peso(x.net), share(x.net, t.net)])}
                />
            </div>
            <div className="rpt-grid">
                <Table
                    title="Top Dishes"
                    note="by quantity"
                    head={["Dish", "Qty", "Sales"]}
                    rows={r.items.slice(0, 10).map((x) => [x.name, x.qty, peso(x.sales)])}
                />
                <section className="grid gap-4" style={{ alignContent: "start" }}>
                    <Table
                        title="Slowest Sellers"
                        note="sold, but least"
                        head={["Dish", "Qty", "Sales"]}
                        rows={slow.map((x) => [x.name, x.qty, peso(x.sales)])}
                    />
                    {t.orders > 0 && unsold.length ? (
                        <div className="alert">
                            <Icon name="alert" />
                            <p>
                                <b>
                                    {unsold.length} {unsold.length === 1 ? "dish" : "dishes"} did not sell at all:
                                </b>{" "}
                                {unsold
                                    .slice(0, 8)
                                    .map((f) => f.name)
                                    .join(", ")}
                                {unsold.length > 8 ? ` and ${unsold.length - 8} more` : ""}
                            </p>
                        </div>
                    ) : null}
                </section>
            </div>
            <div className="rpt-grid">
                <Table
                    title="By Category"
                    note="before discounts"
                    head={["Category", "Qty", "Sales"]}
                    rows={r.byCategory.map((x) => [x.category, x.qty, peso(x.sales)])}
                />
                <Table
                    title="By Table"
                    note="dine-in, top 10"
                    head={["Table", "Orders", "Guests", "Net"]}
                    rows={r.byTable.slice(0, 10).map((x) => [x.table, x.orders, x.guests, peso(x.net)])}
                />
            </div>
            <Table
                title="Discounts Given"
                head={["Discount", "Percent", "Orders", "Amount"]}
                rows={r.discounts.map((x) => [x.name, `${x.pct}%`, x.orders, peso(x.amount)])}
                empty="No discounts were given."
            />
            <Table
                title={`Breakdown by ${unit}`}
                head={[unit, "Orders", "Gross", "Discounts", "Net"]}
                rows={r.series.map((s) => [
                    rangeText(s.from, s.to),
                    s.orders,
                    peso(s.gross),
                    peso(s.discounts),
                    peso(s.net),
                ])}
                foot={["Total", t.orders, peso(t.gross), peso(t.discounts), peso(t.net)]}
            />
        </div>
    );
}
