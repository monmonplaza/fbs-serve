import { useRef, useState } from "react";
import { goToSettingsTab } from "@/pages/settings/SettingsPage";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { api } from "@/api-service";
import { useFloors, useInvalidate, useReservations, useSettings, useTables } from "@/hooks/useApi";
import { TSTAT } from "@/lib/constants";
import type { DiningTable } from "@/types/restaurant";
import { clamp, tm } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { toast } from "@/context/toast";
import { useUi } from "@/context/ui";
import { TableBody, tableOverLimit, tableRes } from "@/components/tables/TableBody";

const RESERVED = { l: "Reserved", c: "reserved" as const, i: "calendar" };

// [top chairs, bottom chairs, width, height, round]. One chair per seat, split above and below the table.
function tableShape(n: number): [number, number, number, number, boolean] {
    const top = Math.ceil(n / 2),
        bot = Math.floor(n / 2);
    if (n <= 2) return [top, bot, 96, 96, true];
    return [top, bot, Math.max(n <= 4 ? 120 : 136, top * 32 + 22), 92, false];
}
const Chairs = ({ n, row }: { n: number; row: number }) => (
    <div className="chairs" style={{ gridColumn: 2, gridRow: row }}>
        {Array.from({ length: n }, (_, i) => (
            <span key={i} className="chair" />
        ))}
    </div>
);

export default function TablesPage() {
    const now = useNow();
    const invalidate = useInvalidate();
    const tables = useTables().data,
        floors = useFloors().data,
        reservations = useReservations().data,
        settings = useSettings();
    const [floorId, setFloorId] = useState("");
    const [openId, setOpenId] = useState<string | null>(null);
    const [edit, setEdit] = useState(false);
    const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
    const drag = useRef<{ id: string; r: DOMRect; dx: number; dy: number; x?: number; y?: number } | null>(null);

    const floor = floors.some((f) => f.id === floorId) ? floorId : floors[0]?.id;
    const list = tables.filter((t) => t.floor === floor);
    const at = (t: DiningTable) => pos[t.id] ?? t;

    const toggle = (id: string) => setOpenId(openId === id ? null : id);
    const save = async (id: string, x: number, y: number) => {
        await api.tables.move(id, x, y);
        await invalidate("tables");
        setPos((p) => {
            const n = { ...p };
            delete n[id];
            return n;
        });
    };
    const down = (e: React.PointerEvent<HTMLButtonElement>, t: DiningTable) => {
        const r = e.currentTarget.closest(".floor")!.getBoundingClientRect();
        drag.current = {
            id: t.id,
            r,
            dx: ((e.clientX - r.left) / r.width) * 100 - t.x,
            dy: ((e.clientY - r.top) / r.height) * 100 - t.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.focus();
        e.preventDefault();
    };
    const move = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        d.x = clamp(((e.clientX - d.r.left) / d.r.width) * 100 - d.dx, 3, 97);
        d.y = clamp(((e.clientY - d.r.top) / d.r.height) * 100 - d.dy, 5, 95);
        setPos((p) => ({ ...p, [d.id]: { x: d.x!, y: d.y! } }));
    };
    const up = () => {
        const d = drag.current;
        drag.current = null;
        if (d && d.x != null) save(d.id, d.x, d.y!);
    };
    const key = (e: React.KeyboardEvent, t: DiningTable) => {
        const k = (
            { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>
        )[e.key];
        if (!k) return;
        const step = e.shiftKey ? 5 : 1,
            c = at(t);
        const x = clamp(c.x + k[0] * step, 3, 97),
            y = clamp(c.y + k[1] * step, 5, 95);
        e.preventDefault();
        setPos((p) => ({ ...p, [t.id]: { x, y } }));
        save(t.id, x, y);
    };
    const toggleEdit = () => {
        setEdit(!edit);
        setOpenId(null);
        if (edit) toast("Table layout saved");
    };

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Tables</h1>
                    <p className="muted">
                        {edit
                            ? "Drag a table to where it sits in your dining room. Arrow keys move the selected table."
                            : "Floor plan of the dining room. Select a table to see its orders."}
                    </p>
                </div>
                <button className="btn btn-outline" onClick={() => goToSettingsTab("tables")}>
                    <Icon name="sliders" size={20} />
                    Manage tables
                </button>
                <button
                    className={`btn ${edit ? "btn-primary" : "btn-outline"} desk-only`}
                    aria-pressed={edit}
                    onClick={toggleEdit}
                >
                    <Icon name={edit ? "check" : "grid"} size={20} />
                    {edit ? "Done arranging" : "Arrange tables"}
                </button>
            </div>
            <div className="floor-bar">
                <div className="chips" role="group" aria-label="Floor level">
                    {floors.map((f) => (
                        <button
                            key={f.id}
                            className="chip"
                            aria-pressed={floor === f.id}
                            onClick={() => {
                                setFloorId(f.id);
                                setOpenId(null);
                            }}
                        >
                            {f.name} <span className="num muted">{tables.filter((t) => t.floor === f.id).length}</span>
                        </button>
                    ))}
                </div>
                <span className="spacer" />
                <div className="legend">
                    {Object.values(TSTAT).map((m) => (
                        <Pill key={m.l} meta={m} />
                    ))}
                    <Pill meta={RESERVED} />
                </div>
            </div>
            <div className="floor-scroll" data-keep="floor">
                <div className={`floor ${edit ? "editing" : ""}`}>
                    {list.map((t) => {
                        const [tp, bt, w, h, round] = tableShape(t.seats),
                            p = at(t);
                        const open = !edit && openId === t.id,
                            over = !edit && tableOverLimit(t, settings),
                            rv = edit ? undefined : tableRes(t, reservations, now);
                        const rface = !!rv && t.status === "inactive";
                        const cls = `tbl ${round ? "round" : ""} t-${rface ? "reserved" : t.status}${over ? " overstay" : ""}`;
                        return (
                            <div
                                key={t.id}
                                className={`tw ${open ? "open" : ""}${pos[t.id] ? " dragging" : ""}`}
                                style={{ left: p.x + "%", top: p.y + "%" }}
                            >
                                <Chairs n={tp} row={1} />
                                <button
                                    id={`tb-${t.id}`}
                                    className={cls}
                                    style={{ width: w, height: h }}
                                    {...(edit
                                        ? {
                                              "aria-label": `Move ${t.name}. Use the arrow keys.`,
                                              onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => down(e, t),
                                              onPointerMove: move,
                                              onPointerUp: up,
                                              onPointerCancel: up,
                                              onKeyDown: (e: React.KeyboardEvent) => key(e, t),
                                          }
                                        : {
                                              "aria-expanded": open,
                                              onClick: () => toggle(t.id),
                                              "aria-label": `${t.name}, ${t.seats} seats, ${TSTAT[t.status].l}${rv ? `, reserved at ${tm(rv.at)}` : ""}${over ? ", over the stay time limit" : ""}`,
                                          })}
                                >
                                    <b>{t.name}</b>
                                    {rface ? (
                                        <>
                                            <span className="st">
                                                <Icon name="calendar" size={16} />
                                                Reserved
                                            </span>
                                            <span className="rsv-time num">{tm(rv!.at)}</span>
                                        </>
                                    ) : (
                                        <span className="st">
                                            <Icon name={edit ? "grid" : TSTAT[t.status].i || "plate"} size={16} />
                                            {edit ? "Drag to move" : TSTAT[t.status].l}
                                        </span>
                                    )}
                                </button>
                                {rv && !rface ? (
                                    <span
                                        className="rsv-badge num"
                                        title={`Reserved at ${tm(rv.at)}`}
                                        aria-hidden="true"
                                    >
                                        <Icon name="calendar" size={13} />
                                        {tm(rv.at)}
                                    </span>
                                ) : null}
                                {over ? (
                                    <span
                                        className="overstay-badge"
                                        title={`Over the ${settings?.tableTimerMins} min stay limit`}
                                        aria-hidden="true"
                                    >
                                        <Icon name="clock" size={14} />
                                    </span>
                                ) : null}
                                <Chairs n={bt} row={3} />
                                {open ? (
                                    <div
                                        className={`pop ${t.y > 55 ? "up" : "dn"} ${t.x > 60 ? "ar" : "al"}`}
                                        role="region"
                                        aria-label={`${t.name} details`}
                                    >
                                        <div className="pop-head">
                                            <h3>{t.name}</h3>
                                            <button
                                                className="icon-btn"
                                                aria-label="Close"
                                                onClick={() => toggle(t.id)}
                                            >
                                                <Icon name="x" />
                                            </button>
                                        </div>
                                        <TableBody t={t} rv={rv} />
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                    {list.length ? null : (
                        <div className="empty" style={{ position: "absolute", inset: 0, justifyContent: "center" }}>
                            No tables on this floor yet.
                            <button className="btn btn-primary" onClick={() => goToSettingsTab("tables")}>
                                Add a table
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="tlist">
                {list.map((t) => {
                    const open = openId === t.id,
                        over = tableOverLimit(t, settings),
                        rv = tableRes(t, reservations, now);
                    return (
                        <div key={t.id} className={`trow ${open ? "open" : ""}`}>
                            <button aria-expanded={open} onClick={() => toggle(t.id)}>
                                <span className="grow">
                                    <b>{t.name}</b>
                                    <span className="caption muted"> · {t.seats} seats</span>
                                </span>
                                {over ? (
                                    <span className="pill p-error">
                                        <Icon name="clock" size={16} />
                                        Over time limit
                                    </span>
                                ) : null}
                                {rv ? <Pill meta={RESERVED} /> : null}
                                <Pill meta={TSTAT[t.status]} />
                                <span className="chev">
                                    <Icon name="chev" />
                                </span>
                            </button>
                            {open ? (
                                <div className="tbody">
                                    <TableBody t={t} rv={rv} />
                                </div>
                            ) : null}
                        </div>
                    );
                })}
                {list.length ? null : <div className="card empty">No tables on this floor yet.</div>}
            </div>
        </>
    );
}
