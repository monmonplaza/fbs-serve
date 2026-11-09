import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Order } from "@/types/restaurant";
import { peso } from "@/lib/format";
import {
    addDays,
    axisPeso,
    dayStart,
    dayTotal,
    hourLabel,
    hourRange,
    hourly,
    runningTotal,
    shortHour,
    ticks,
    type HourSales,
} from "@/lib/salesStats";

const H = 220,
    TOP = 12,
    BOTTOM = 28,
    LEFT = 52;

/** Width of the chart box, so the SVG draws at real pixels and its text stays crisp. */
function useWidth() {
    const ref = useRef<HTMLDivElement>(null);
    const [w, setW] = useState(0);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, w] as const;
}

const ymd = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const longDay = (t: number) =>
    new Date(t).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

/** Gridlines and y-axis labels, shared by both charts. */
function Grid({ w, top, y }: { w: number; top: number[]; y: (v: number) => number }) {
    const max = top[top.length - 1];
    return (
        <g>
            {top.map((v) => (
                <g key={v}>
                    <line x1={LEFT} x2={w} y1={y(v)} y2={y(v)} stroke="var(--hairline)" strokeWidth={1} />
                    <text x={LEFT - 8} y={y(v)} dy="0.32em" textAnchor="end" className="chart-axis">
                        {axisPeso(v, max)}
                    </text>
                </g>
            ))}
        </g>
    );
}

function HourAxis({ hours, x, w }: { hours: number[]; x: (h: number) => number; w: number }) {
    // Fewer labels on a narrow chart so they never collide.
    const every = w < 420 ? 4 : w < 640 ? 3 : 2;
    return (
        <g>
            {hours
                .filter((h) => h % every === 0)
                .map((h) => (
                    <text key={h} x={x(h)} y={H - 8} textAnchor="middle" className="chart-axis">
                        {shortHour(h)}
                    </text>
                ))}
        </g>
    );
}

function Tip({ x, w, children }: { x: number; w: number; children: ReactNode }) {
    const left = Math.min(Math.max(x, 90), w - 90);
    return (
        <div className="chart-tip" style={{ left, top: 4 }} role="status">
            {children}
        </div>
    );
}

function TableView({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
    return (
        <details className="chart-table">
            <summary className="caption muted">Show as table</summary>
            <table className="data">
                <caption className="sr-only">{caption}</caption>
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
                    {rows.map((r) => (
                        <tr key={String(r[0])}>
                            {r.map((c, i) => (
                                <td key={i} className={i ? "r num" : undefined}>
                                    {c}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </details>
    );
}

/** Sales on one chosen day, by the hour they were paid. */
export function DaySalesChart({ orders, now }: { orders: Order[]; now: number }) {
    const today = dayStart(now);
    const [day, setDay] = useState(today);
    const [hover, setHover] = useState<number | null>(null);
    const [box, w] = useWidth();
    const rows = hourly(orders, day);
    const [lo, hi] = hourRange(rows);
    const shown = rows.slice(lo, hi + 1);
    const amount = dayTotal(rows),
        count = rows.reduce((n, r) => n + r.orders, 0);
    const best = shown.reduce<HourSales | null>((b, r) => (r.amount > (b?.amount ?? 0) ? r : b), null);

    const yt = ticks(Math.max(...shown.map((r) => r.amount)));
    const top = yt[yt.length - 1];
    const band = (w - LEFT) / shown.length;
    const bw = Math.min(24, Math.max(4, band - 2));
    const x = (h: number) => LEFT + (h - lo) * band + band / 2;
    const y = (v: number) => TOP + (H - TOP - BOTTOM) * (1 - v / top);
    const base = y(0);
    const col = (r: HourSales) => {
        const t = y(r.amount),
            l = x(r.hour) - bw / 2,
            rad = Math.min(4, base - t);
        return `M${l},${base}V${t + rad}Q${l},${t} ${l + rad},${t}H${l + bw - rad}Q${l + bw},${t} ${l + bw},${t + rad}V${base}Z`;
    };
    const hv = hover == null ? null : rows[hover];

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h3>Sales by Hour</h3>
                    <span className="caption muted">{day === today ? "Today" : longDay(day)}</span>
                </div>
                <div className="chart-filters">
                    <button
                        type="button"
                        className="btn btn-outline"
                        aria-label="Previous day"
                        onClick={() => setDay(addDays(day, -1))}
                    >
                        ‹
                    </button>
                    <input
                        type="date"
                        className="input"
                        aria-label="Day to show"
                        value={ymd(day)}
                        max={ymd(today)}
                        onChange={(e) => {
                            const [yy, mm, dd] = e.target.value.split("-").map(Number);
                            if (yy) setDay(+new Date(yy, mm - 1, dd));
                        }}
                    />
                    <button
                        type="button"
                        className="btn btn-outline"
                        aria-label="Next day"
                        disabled={day >= today}
                        onClick={() => setDay(Math.min(today, addDays(day, 1)))}
                    >
                        ›
                    </button>
                    {day !== today ? (
                        <button type="button" className="btn btn-outline" onClick={() => setDay(today)}>
                            Today
                        </button>
                    ) : null}
                </div>
            </div>
            <div className="chart-hero">
                <span className="val num">{peso(amount)}</span>
                <span className="caption muted">
                    {count} paid {count === 1 ? "order" : "orders"}
                    {best ? ` · busiest ${hourLabel(best.hour)}` : ""}
                </span>
            </div>
            <div ref={box} className="chart-box" onMouseLeave={() => setHover(null)}>
                {w > 0 ? (
                    <svg width={w} height={H} role="img" aria-label={`Sales by hour on ${longDay(day)}`}>
                        <Grid w={w} top={yt} y={y} />
                        {shown.map((r) =>
                            r.amount > 0 ? (
                                <path
                                    key={r.hour}
                                    d={col(r)}
                                    fill="var(--chart-1)"
                                    opacity={hover == null || hover === r.hour ? 1 : 0.45}
                                />
                            ) : null,
                        )}
                        <line x1={LEFT} x2={w} y1={base} y2={base} stroke="var(--border-control)" strokeWidth={1} />
                        <HourAxis hours={shown.map((r) => r.hour)} x={x} w={w} />
                        {shown.map((r) => (
                            <rect
                                key={r.hour}
                                x={x(r.hour) - band / 2}
                                y={TOP}
                                width={band}
                                height={base - TOP}
                                fill="transparent"
                                onMouseEnter={() => setHover(r.hour)}
                                onClick={() => setHover(r.hour)}
                            />
                        ))}
                    </svg>
                ) : null}
                {hv ? (
                    <Tip x={x(hv.hour)} w={w}>
                        <b>
                            {hourLabel(hv.hour)} – {hourLabel((hv.hour + 1) % 24)}
                        </b>
                        <span className="num">{peso(hv.amount)}</span>
                        <span className="muted">
                            {hv.orders} {hv.orders === 1 ? "order" : "orders"}
                        </span>
                    </Tip>
                ) : null}
                {!amount ? <div className="chart-empty caption muted">No paid orders on this day.</div> : null}
            </div>
            <TableView
                caption={`Sales by hour on ${longDay(day)}`}
                head={["Hour", "Orders", "Sales"]}
                rows={shown.filter((r) => r.orders).map((r) => [hourLabel(r.hour), r.orders, peso(r.amount)])}
            />
        </section>
    );
}

/** Running sales total through the day, today against yesterday. */
export function CompareChart({ orders, now }: { orders: Order[]; now: number }) {
    const today = dayStart(now),
        yday = addDays(today, -1);
    const [hover, setHover] = useState<number | null>(null);
    const [box, w] = useWidth();
    const tRows = hourly(orders, today),
        yRows = hourly(orders, yday);
    const [lo, hi] = hourRange(tRows, yRows);
    const hours = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const tRun = runningTotal(tRows),
        yRun = runningTotal(yRows);
    const nowHour = new Date(now).getHours();
    const lastToday = Math.max(lo, Math.min(hi, nowHour));
    const tTotal = tRun[23],
        yTotal = yRun[23],
        ySameTime = yRun[nowHour];
    const diff = ySameTime > 0 ? Math.round(((tTotal - ySameTime) / ySameTime) * 100) : null;

    const right = 64;
    const yt = ticks(Math.max(tTotal, yTotal));
    const top = yt[yt.length - 1];
    const step = (w - LEFT - right) / Math.max(1, hours.length - 1);
    const x = (h: number) => LEFT + (h - lo) * step;
    const y = (v: number) => TOP + (H - TOP - BOTTOM) * (1 - v / top);
    const line = (run: number[], last: number) =>
        hours
            .filter((h) => h <= last)
            .map((h, i) => `${i ? "L" : "M"}${x(h)},${y(run[h])}`)
            .join("");
    const tLine = line(tRun, lastToday),
        yLine = line(yRun, hi);
    const tArea = `${tLine}L${x(lastToday)},${y(0)}L${x(lo)},${y(0)}Z`;
    // End labels: nudge apart only when the two ends are almost on top of each other.
    let tEndY = y(tRun[lastToday]),
        yEndY = y(yRun[hi]);
    if (Math.abs(tEndY - yEndY) < 14 && x(lastToday) > x(hi) - 40) {
        const mid = (tEndY + yEndY) / 2,
            up = tEndY <= yEndY;
        tEndY = mid + (up ? -8 : 8);
        yEndY = mid + (up ? 8 : -8);
    }
    const hv = hover;

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h3>Today vs Yesterday</h3>
                    <span className="caption muted">Running sales total through the day</span>
                </div>
            </div>
            <div className="chart-hero">
                <span className="val num">{peso(tTotal)}</span>
                <span className="caption muted">
                    {diff == null
                        ? `Yesterday had no sales by ${hourLabel(nowHour)}`
                        : `${diff >= 0 ? "+" : "−"}${Math.abs(diff)}% vs yesterday at ${hourLabel(nowHour)} (${peso(ySameTime)})`}
                </span>
            </div>
            <ul className="chart-legend" aria-label="Legend">
                <li>
                    <span className="key" style={{ background: "var(--chart-1)" }} />
                    Today <span className="num muted">{peso(tTotal)}</span>
                </li>
                <li>
                    <span className="key key-dash" style={{ color: "var(--chart-2)" }} />
                    Yesterday <span className="num muted">{peso(yTotal)}</span>
                </li>
            </ul>
            <div ref={box} className="chart-box" onMouseLeave={() => setHover(null)}>
                {w > 0 ? (
                    <svg width={w} height={H} role="img" aria-label="Running sales total, today against yesterday">
                        <Grid w={w - right} top={yt} y={y} />
                        <path d={tArea} fill="var(--chart-1)" opacity={0.1} />
                        <path
                            d={yLine}
                            fill="none"
                            stroke="var(--chart-2)"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                        <path
                            d={tLine}
                            fill="none"
                            stroke="var(--chart-1)"
                            strokeWidth={2}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                        <line
                            x1={LEFT}
                            x2={w - right}
                            y1={y(0)}
                            y2={y(0)}
                            stroke="var(--border-control)"
                            strokeWidth={1}
                        />
                        <HourAxis hours={hours} x={x} w={w} />
                        {hv != null ? (
                            <line x1={x(hv)} x2={x(hv)} y1={TOP} y2={y(0)} stroke="var(--ink-muted)" strokeWidth={1} />
                        ) : null}
                        <circle
                            cx={x(hi)}
                            cy={y(yRun[hi])}
                            r={4}
                            fill="var(--chart-2)"
                            stroke="var(--surface-card)"
                            strokeWidth={2}
                        />
                        <circle
                            cx={x(lastToday)}
                            cy={y(tRun[lastToday])}
                            r={4}
                            fill="var(--chart-1)"
                            stroke="var(--surface-card)"
                            strokeWidth={2}
                        />
                        {hv != null && hv <= lastToday ? (
                            <circle
                                cx={x(hv)}
                                cy={y(tRun[hv])}
                                r={4}
                                fill="var(--chart-1)"
                                stroke="var(--surface-card)"
                                strokeWidth={2}
                            />
                        ) : null}
                        {hv != null ? (
                            <circle
                                cx={x(hv)}
                                cy={y(yRun[hv])}
                                r={4}
                                fill="var(--chart-2)"
                                stroke="var(--surface-card)"
                                strokeWidth={2}
                            />
                        ) : null}
                        <text x={x(hi) + 8} y={yEndY} dy="0.32em" className="chart-label">
                            Yesterday
                        </text>
                        <text x={x(lastToday) + 8} y={tEndY} dy="0.32em" className="chart-label">
                            Today
                        </text>
                        {hours.map((h) => (
                            <rect
                                key={h}
                                x={x(h) - step / 2}
                                y={TOP}
                                width={step}
                                height={y(0) - TOP}
                                fill="transparent"
                                onMouseEnter={() => setHover(h)}
                                onClick={() => setHover(h)}
                            />
                        ))}
                    </svg>
                ) : null}
                {hv != null ? (
                    <Tip x={x(hv)} w={w}>
                        <b>By {hourLabel((hv + 1) % 24)}</b>
                        <span>
                            <i className="dot" style={{ background: "var(--chart-1)" }} /> Today{" "}
                            <span className="num">{hv <= lastToday ? peso(tRun[hv]) : "—"}</span>
                        </span>
                        <span>
                            <i className="dot" style={{ background: "var(--chart-2)" }} /> Yesterday{" "}
                            <span className="num">{peso(yRun[hv])}</span>
                        </span>
                    </Tip>
                ) : null}
            </div>
            <TableView
                caption="Running sales total, today against yesterday"
                head={["By", "Today", "Yesterday"]}
                rows={hours.map((h) => [hourLabel((h + 1) % 24), h <= lastToday ? peso(tRun[h]) : "—", peso(yRun[h])])}
            />
        </section>
    );
}
