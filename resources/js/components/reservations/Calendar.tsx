import { useTables } from "@/hooks/useApi";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import type { Reservation } from "@/types/restaurant";
import { tm } from "@/lib/format";
import { RSTAT, addDays, fullDay, sod, tmc, useResUi, weekStart } from "@/lib/reservationHelpers";
import { moveToDay, openRes, openResForm } from "@/lib/reservationActions";

const byDayMap = (list: Reservation[]) => {
    const m = new Map<number, Reservation[]>();
    list.slice()
        .sort((a, b) => a.at - b.at)
        .forEach((r) => {
            const k = sod(r.at);
            m.set(k, [...(m.get(k) || []), r]);
        });
    return m;
};

// Drag a booked reservation onto another day to reschedule it. The Reschedule button does the same without a mouse.
const dragProps = (r: Reservation) =>
    r.status === "booked"
        ? {
              draggable: true,
              onDragStart: (e: React.DragEvent) => {
                  e.dataTransfer.setData("text/plain", r.id);
                  e.dataTransfer.effectAllowed = "move";
              },
          }
        : {};
const dropProps = (day: number, list: Reservation[]) => ({
    onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add("over");
    },
    onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) e.currentTarget.classList.remove("over");
    },
    onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove("over");
        const r = list.find((x) => x.id === e.dataTransfer.getData("text/plain"));
        if (r) moveToDay(r, day);
    },
});
const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
};

function Chip({ r }: { r: Reservation }) {
    return (
        <button
            className={`cal-chip st-${r.status}`}
            {...dragProps(r)}
            aria-label={`${tm(r.at)}, ${r.name}, ${r.pax} guests, ${RSTAT[r.status].l}`}
            onClick={stop(() => openRes(r))}
        >
            <span className="tt num">{tmc(r.at)}</span>
            <span className="nm">{r.name}</span>
            {r.order?.length ? <Icon name="receipt" size={12} /> : null}
        </button>
    );
}

export function MonthView({ list }: { list: Reservation[] }) {
    const { day: sel, set } = useResUi();
    const tables = useTables().data;
    const tName = (id: string) => tables.find((t) => t.id === id)?.name || "Deleted table";
    const byDay = byDayMap(list),
        today = sod(Date.now());
    const first = new Date(sel);
    first.setDate(1);
    const start = weekStart(+first),
        month = first.getMonth(),
        last = new Date(first.getFullYear(), month + 1, 0).getTime();
    const rows = Math.max(4, Math.min(6, Math.ceil(((last - start) / 86400000 + 1) / 7)));
    const cells = Array.from({ length: rows * 7 }, (_, i) => addDays(start, i));
    const day = byDay.get(sel) || [];
    return (
        <div className="res-layout">
            <div className="cal">
                <div className="cal-dows">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => (
                        <div key={x}>{x}</div>
                    ))}
                </div>
                <div className="cal-grid">
                    {cells.map((ts) => {
                        const rs = byDay.get(ts) || [],
                            d = new Date(ts);
                        return (
                            <div
                                key={ts}
                                className={`cal-cell ${d.getMonth() !== month ? "out" : ""} ${ts === today ? "today" : ""} ${ts === sel ? "sel" : ""}`}
                                onClick={() => set({ day: ts })}
                                {...dropProps(ts, list)}
                            >
                                <button
                                    className="cal-num num"
                                    aria-label={`${fullDay(ts)}, ${rs.length} reservations`}
                                    aria-current={ts === sel ? "date" : undefined}
                                    onClick={stop(() => set({ day: ts }))}
                                >
                                    {d.getDate()}
                                </button>
                                <button
                                    className="cal-add"
                                    aria-label={`New reservation on ${fullDay(ts)}`}
                                    onClick={stop(() => openResForm(null, ts))}
                                >
                                    <Icon name="plus" size={16} />
                                </button>
                                {rs.slice(0, 3).map((r) => (
                                    <Chip key={r.id} r={r} />
                                ))}
                                {rs.length > 3 ? (
                                    <button className="cal-more" onClick={stop(() => set({ day: ts }))}>
                                        +{rs.length - 3} more
                                    </button>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
            <section className="card agenda" aria-label={`Reservations on ${fullDay(sel)}`}>
                <div className="card-head" style={{ margin: 0 }}>
                    <h3>{fullDay(sel)}</h3>
                    <span className="badge soft num">{day.length}</span>
                </div>
                {day.length ? (
                    <ul>
                        {day.map((r) => (
                            <li key={r.id}>
                                <button className="ag-item" onClick={() => openRes(r)}>
                                    <span className="tt num">{tm(r.at)}</span>
                                    <span className="grow">
                                        <b>{r.name}</b>
                                        <div className="caption muted">
                                            {r.pax} guests · {r.tableId ? tName(r.tableId) : "No table yet"}
                                        </div>
                                        {r.order?.length ? (
                                            <span className="pill p-brand" style={{ marginTop: 4 }}>
                                                <Icon name="receipt" size={14} />
                                                Pre-order
                                            </span>
                                        ) : null}
                                    </span>
                                    <Pill meta={RSTAT[r.status]} withIcon={false} />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="caption muted">No reservations on this day.</p>
                )}
                <button className="btn btn-outline" onClick={() => openResForm(null, sel)}>
                    <Icon name="plus" size={20} />
                    Add on this day
                </button>
            </section>
        </div>
    );
}

export function WeekView({ list }: { list: Reservation[] }) {
    const day = useResUi((s) => s.day);
    const tables = useTables().data;
    const tName = (id: string) => tables.find((t) => t.id === id)?.name || "Deleted table";
    const byDay = byDayMap(list),
        ws = weekStart(day),
        today = sod(Date.now());
    return (
        <div className="wk">
            {Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map((ts) => {
                const rs = byDay.get(ts) || [];
                return (
                    <section
                        key={ts}
                        className={`wk-day ${ts === today ? "today" : ""}`}
                        aria-label={fullDay(ts)}
                        {...dropProps(ts, list)}
                    >
                        <button
                            className="wk-head"
                            aria-label={`New reservation on ${fullDay(ts)}`}
                            onClick={() => openResForm(null, ts)}
                        >
                            <span>
                                {new Date(ts).toLocaleDateString("en-PH", { weekday: "short", day: "numeric" })}
                            </span>
                            <span className="caption muted">
                                {rs.length || ""}
                                <Icon name="plus" size={14} />
                            </span>
                        </button>
                        {rs.map((r) => (
                            <button
                                key={r.id}
                                className={`wk-card st-${r.status}`}
                                {...dragProps(r)}
                                onClick={() => openRes(r)}
                            >
                                <span className="t num">
                                    {tm(r.at)}
                                    {r.order?.length ? " · Pre-order" : ""}
                                </span>
                                <span>{r.name}</span>
                                <span className="caption muted">
                                    {r.pax} guests · {r.tableId ? tName(r.tableId) : "No table"}
                                </span>
                            </button>
                        ))}
                        {rs.length ? null : <span className="caption muted">Free</span>}
                    </section>
                );
            })}
        </div>
    );
}
