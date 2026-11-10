import { useState } from "react";
import { api } from "@/api-service";
import { useCategories, useFloors, useFoods, useReservations, useTables } from "@/hooks/useApi";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { TableQr } from "@/components/tables/QrModal";
import { closeModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { dt, peso, sum, tm } from "@/lib/format";
import { hasV } from "@/lib/domain";
import { resProblem } from "@/lib/reservations";
import type { Food, Variant } from "@/types/restaurant";
import {
    RSTAT,
    draftItems,
    hm,
    parseAt,
    resTotal,
    sod,
    useDraft,
    useResUi,
    whenText,
    ymd,
} from "@/lib/reservationHelpers";
import {
    attempt,
    openCancel,
    openDelete,
    openGuestView,
    openMove,
    openResForm,
    openResFormStep,
    openResOrder,
    refresh,
    restoreRes,
    seatAt,
    seatNow,
} from "@/lib/reservationActions";

function TableOptions() {
    const floors = useFloors().data,
        tables = useTables().data;
    return (
        <>
            <option value="">Not assigned yet</option>
            {floors.map((fl) => (
                <optgroup key={fl.id} label={fl.name}>
                    {tables
                        .filter((t) => t.floor === fl.id)
                        .map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name} · {t.seats} seats
                            </option>
                        ))}
                </optgroup>
            ))}
        </>
    );
}

/** Live check while the date, time or table changes. */
function Hint({
    tableId,
    pax,
    date,
    time,
    ignoreId,
}: {
    tableId: string;
    pax: number;
    date: string;
    time: string;
    ignoreId: string;
}) {
    const tables = useTables().data,
        list = useReservations().data;
    const at = parseAt(date, time);
    const msg = tableId && isFinite(at) ? resProblem(tables, list, tableId, pax, at, ignoreId) : "";
    const t = tables.find((x) => x.id === tableId);
    return (
        <span className={`hint ${msg ? "bad" : ""}`} id="res-hint">
            {msg || (t ? `${t.name} is free at that time.` : "")}
        </span>
    );
}

export function ResModal({ id }: { id: string }) {
    const r = useReservations().data.find((x) => x.id === id),
        tables = useTables().data;
    if (!r) return null;
    const t = tables.find((x) => x.id === r.tableId),
        o = r.order || [],
        m = RSTAT[r.status];
    return (
        <>
            <div className="m-body">
                <dl className="kv">
                    <dt>Status</dt>
                    <dd>
                        <Pill meta={m} />
                    </dd>
                    <dt>When</dt>
                    <dd className="num">{whenText(r.at)}</dd>
                    <dt>Guests</dt>
                    <dd className="num">{r.pax}</dd>
                    <dt>Table</dt>
                    <dd>{t ? `${t.name} · ${t.seats} seats` : "Not assigned yet"}</dd>
                    {r.phone ? (
                        <>
                            <dt>Phone</dt>
                            <dd className="num">{r.phone}</dd>
                        </>
                    ) : null}
                    {r.note ? (
                        <>
                            <dt>Note</dt>
                            <dd>{r.note}</dd>
                        </>
                    ) : null}
                    {r.cancelReason ? (
                        <>
                            <dt>Reason</dt>
                            <dd>{r.cancelReason}</dd>
                        </>
                    ) : null}
                </dl>
                {o.length ? (
                    <div>
                        <b>Advance order</b>
                        <ul className="items" style={{ marginTop: 8 }}>
                            {o.map((i, k) => (
                                <li key={k}>
                                    <b className="num">{i.qty}×</b>
                                    <span>{i.name}</span>
                                    <span className="num">{peso(i.qty * i.price)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="sum" style={{ marginTop: 8 }}>
                            <div className="total">
                                <span>Total</span>
                                <span className="num">{peso(resTotal(r))}</span>
                            </div>
                        </div>
                        <p className="caption muted" style={{ marginTop: 8 }}>
                            Paid at the table. It goes on the table’s plate when the guests are seated.
                        </p>
                    </div>
                ) : null}
                <div>
                    <b>History</b>
                    <ul className="items caption muted" style={{ marginTop: 8 }}>
                        {r.history
                            .slice()
                            .reverse()
                            .map((h, k) => (
                                <li key={k}>
                                    <span className="num">
                                        {dt(h.at)}, {tm(h.at)}
                                    </span>
                                    <span>{h.text}</span>
                                </li>
                            ))}
                    </ul>
                </div>
            </div>
            <div className="m-foot">
                <button className="btn btn-outline" onClick={closeModal}>
                    Close
                </button>
                <button className="btn btn-outline danger" onClick={() => openDelete(r)}>
                    <Icon name="trash" size={20} />
                    Delete
                </button>
                {r.status === "booked" ? (
                    <>
                        <button className="btn btn-outline danger" onClick={() => openCancel(r)}>
                            <Icon name="x" size={20} />
                            Cancel
                        </button>
                        <button className="btn btn-outline" onClick={() => openResForm(r)}>
                            <Icon name="edit" size={20} />
                            Edit
                        </button>
                        <button className="btn btn-outline" onClick={() => openMove(r)}>
                            <Icon name="clock" size={20} />
                            Reschedule
                        </button>
                        <button className="btn btn-primary" onClick={() => seatNow(r.id)}>
                            <Icon name="qr" size={20} />
                            Seat now
                        </button>
                    </>
                ) : r.status === "arrived" ? null : (
                    <button className="btn btn-primary" onClick={() => restoreRes(r)}>
                        <Icon name="check" size={20} />
                        Restore
                    </button>
                )}
            </div>
        </>
    );
}

function AdvSummary() {
    const foods = useFoods().data,
        order = useDraft((s) => s.order),
        d = useDraft.getState().draft;
    const items = draftItems(order, foods);
    return (
        <>
            {items.length ? (
                <>
                    <ul className="items">
                        {items.map((i, k) => (
                            <li key={k}>
                                <b className="num">{i.qty}×</b>
                                <span>{i.name}</span>
                                <span className="num">{peso(i.price * i.qty)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="sum" style={{ marginTop: 8 }}>
                        <div className="total">
                            <span>Total</span>
                            <span className="num">{peso(sum(items.map((i) => i.price * i.qty)))}</span>
                        </div>
                    </div>
                </>
            ) : (
                <p className="caption muted">No food picked yet.</p>
            )}
            <button
                type="button"
                className="btn btn-outline"
                style={{ marginTop: 8 }}
                onClick={() => {
                    useDraft.getState().setDraft({ adv: true });
                    openResOrder(d.name);
                }}
            >
                <Icon name="plus" size={20} />
                {items.length ? "Change food" : "Pick food"}
            </button>
        </>
    );
}

export function ResFormModal() {
    const d = useDraft((s) => s.draft),
        set = useDraft.getState().setDraft;
    const foods = useFoods().data;
    const edit = !!d.id;
    const bind = (k: "name" | "phone" | "pax" | "date" | "time" | "note") => ({
        value: d[k],
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set({ [k]: e.target.value }),
    });
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const at = parseAt(d.date, d.time),
            pax = Math.round(+d.pax),
            name = d.name.trim();
        if (!name || !isFinite(at) || !(pax >= 1)) return toast("Fill in the name, guests, date and time");
        let order = null;
        if (d.adv) {
            order = draftItems(useDraft.getState().order, foods);
            if (!order.length) return toast("Pick food for the advance order, or turn it off");
        }
        const v = { name, phone: d.phone.trim(), pax, at, tableId: d.tableId || null, note: d.note.trim(), order };
        if (await attempt(() => (edit ? api.reservations.update(d.id, v) : api.reservations.create(v)))) {
            toast(edit ? `${name} saved` : `${name} booked for ${whenText(at)}`);
            useResUi.getState().set({ day: sod(at) });
            await refresh();
            closeModal();
        }
    };
    return (
        <form id="res-form" onSubmit={submit}>
            <div className="m-body">
                <div className="form-grid">
                    <label className="field full">
                        <span>Guest name</span>
                        <input
                            id="rf-name"
                            name="name"
                            className="input"
                            required
                            maxLength={50}
                            autoComplete="off"
                            autoFocus
                            {...bind("name")}
                        />
                    </label>
                    <label className="field">
                        <span>Phone</span>
                        <input
                            name="phone"
                            className="input num"
                            inputMode="tel"
                            maxLength={20}
                            autoComplete="off"
                            {...bind("phone")}
                        />
                    </label>
                    <label className="field">
                        <span>Number of guests</span>
                        <input
                            name="pax"
                            className="input num"
                            type="number"
                            min={1}
                            max={40}
                            inputMode="numeric"
                            required
                            {...bind("pax")}
                        />
                    </label>
                    <label className="field">
                        <span>Date</span>
                        <input
                            name="date"
                            className="input"
                            type="date"
                            required
                            min={edit ? undefined : ymd(Date.now())}
                            {...bind("date")}
                        />
                    </label>
                    <label className="field">
                        <span>Time</span>
                        <input name="time" className="input" type="time" required {...bind("time")} />
                    </label>
                    <label className="field full">
                        <span>Table (optional)</span>
                        <select
                            name="table"
                            className="input"
                            value={d.tableId}
                            onChange={(e) => set({ tableId: e.target.value })}
                        >
                            <TableOptions />
                        </select>
                        <Hint tableId={d.tableId} pax={+d.pax || 1} date={d.date} time={d.time} ignoreId={d.id} />
                    </label>
                    <label className="field full">
                        <span>Note</span>
                        <textarea
                            name="note"
                            className="input"
                            maxLength={200}
                            placeholder="Birthday, high chair, allergy"
                            {...bind("note")}
                        />
                    </label>
                    <div className="field full">
                        <label className="radio-card">
                            <input
                                type="checkbox"
                                name="adv"
                                checked={d.adv}
                                onChange={(e) => set({ adv: e.target.checked })}
                            />
                            <span className="grow">
                                <b>Advance order</b>
                                <br />
                                <span className="caption muted">
                                    The guests pre-order food. It goes on their table’s plate when they are seated.
                                </span>
                            </span>
                        </label>
                        <div id="res-adv" hidden={!d.adv} style={{ marginTop: 8 }}>
                            <AdvSummary />
                        </div>
                    </div>
                </div>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary">{edit ? "Save changes" : "Book reservation"}</button>
            </div>
        </form>
    );
}

export function ResOrderModal() {
    const foods = useFoods().data,
        allCats = useCategories().data;
    const d = useDraft((s) => s.order),
        cat = useDraft((s) => s.cat),
        draft = useDraft((s) => s.draft);
    const { setOrder, setCat, setDraft } = useDraft.getState();
    const items = draftItems(d, foods),
        n = sum(items.map((i) => i.qty)),
        tot = sum(items.map((i) => i.price * i.qty));
    const cats = allCats.filter((c) => foods.some((f) => f.cat === c.id && f.status === "available"));
    const qty = (k: string, by: number) => setOrder({ ...d, [k]: Math.max(0, (d[k] || 0) + by) });
    const card = (f: Food, v?: Variant) => {
        const k = v ? f.id + "|" + v.id : f.id,
            nm = v ? `${f.name} (${v.name})` : f.name;
        return (
            <div key={k} className={`to-food ${d[k] ? "on" : ""}`}>
                <div>
                    <b>{f.name}</b>
                    {v ? (
                        <span className="vchip" style={{ marginLeft: 6 }}>
                            {v.name}
                        </span>
                    ) : null}
                    <div className="caption muted num">
                        {peso(v ? v.price : f.price)} · {f.eta} min
                    </div>
                </div>
                {d[k] ? (
                    <div className="stepper" style={{ alignSelf: "flex-start" }}>
                        <button type="button" aria-label={`Remove one ${nm}`} onClick={() => qty(k, -1)}>
                            <Icon name={d[k] > 1 ? "minus" : "trash"} size={18} />
                        </button>
                        <span className="num">{d[k]}</span>
                        <button type="button" aria-label={`Add one ${nm}`} onClick={() => qty(k, 1)}>
                            <Icon name="plus" size={18} />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="btn btn-outline"
                        aria-label={`Add ${nm}`}
                        onClick={() => qty(k, 1)}
                    >
                        <Icon name="plus" size={18} />
                        Add
                    </button>
                )}
            </div>
        );
    };
    const cards = (f: Food) => (hasV(f) ? f.variants.map((v) => card(f, v)) : card(f));
    const avail = (c: string) => foods.filter((f) => f.cat === c && f.status === "available");
    return (
        <>
            <div className="m-body">
                <div className="tabs to-tabs" role="tablist" aria-label="Food category">
                    {[{ id: "all", name: "All" }, ...cats].map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            className="tab"
                            role="tab"
                            aria-selected={cat === c.id}
                            onClick={() => {
                                setCat(c.id);
                                document.getElementById("modal")?.scrollTo(0, 0);
                            }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="to-grid">
                    <div className="to-foods">
                        {cat === "all"
                            ? cats.map((c) => (
                                  <div key={c.id} style={{ display: "contents" }}>
                                      <span className="label muted to-cat">{c.name}</span>
                                      {avail(c.id).map(cards)}
                                  </div>
                              ))
                            : avail(cat).map(cards)}
                    </div>
                    <aside className="to-side">
                        <b>Advance order</b>
                        {n ? (
                            <>
                                <ul className="items">
                                    {items.map((i, k) => (
                                        <li key={k}>
                                            <b className="num">{i.qty}×</b>
                                            <span>{i.name}</span>
                                            <span className="num">{peso(i.price * i.qty)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="sum">
                                    <div className="total">
                                        <span>Total</span>
                                        <span className="num">{peso(tot)}</span>
                                    </div>
                                </div>
                                <span className="caption muted">Paid at the table when they bill out.</span>
                            </>
                        ) : (
                            <p className="caption muted">No food yet. Pick from the tabs.</p>
                        )}
                    </aside>
                </div>
            </div>
            <div className="m-foot to-foot">
                <span className="grow caption muted num">
                    {n ? `${n} items · ${peso(tot)}` : "Nothing picked yet."}
                </span>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setDraft({ adv: items.length > 0 });
                        openResFormStep(!!draft.id);
                    }}
                >
                    Done{n ? " · " + peso(tot) : ""}
                </button>
            </div>
        </>
    );
}

export function ResMoveModal({ id }: { id: string }) {
    const r = useReservations().data.find((x) => x.id === id),
        tables = useTables().data;
    const [date, setDate] = useState(r ? ymd(r.at) : ""),
        [time, setTime] = useState(r ? hm(r.at) : ""),
        [table, setTable] = useState(r?.tableId || ""),
        [reason, setReason] = useState("");
    if (!r) return null;
    const t = tables.find((x) => x.id === r.tableId);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const at = parseAt(date, time);
        if (await attempt(() => api.reservations.move(r.id, at, table || null, reason.trim()))) {
            useResUi.getState().set({ day: sod(at) });
            await refresh();
            closeModal();
            toast(`${r.name} moved to ${whenText(at)}`);
        }
    };
    return (
        <form id="move-form" onSubmit={submit}>
            <div className="m-body">
                <p className="caption muted">
                    Now: <b className="num">{whenText(r.at)}</b> · {r.pax} guests{t ? " · " + t.name : ""}
                </p>
                <div className="form-grid">
                    <label className="field">
                        <span>New date</span>
                        <input
                            name="date"
                            className="input"
                            type="date"
                            required
                            min={ymd(Date.now())}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        <span>New time</span>
                        <input
                            name="time"
                            className="input"
                            type="time"
                            required
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </label>
                    <label className="field full">
                        <span>Table</span>
                        <select name="table" className="input" value={table} onChange={(e) => setTable(e.target.value)}>
                            <TableOptions />
                        </select>
                        <Hint tableId={table} pax={r.pax} date={date} time={time} ignoreId={r.id} />
                    </label>
                    <label className="field full">
                        <span>Reason (optional)</span>
                        <input
                            name="reason"
                            className="input"
                            maxLength={120}
                            autoComplete="off"
                            placeholder="Guest asked to move"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </label>
                </div>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Back
                </button>
                <button className="btn btn-primary">
                    <Icon name="clock" size={20} />
                    Reschedule
                </button>
            </div>
        </form>
    );
}

export function ResCancelModal({ id }: { id: string }) {
    const r = useReservations().data.find((x) => x.id === id),
        tables = useTables().data;
    const [reason, setReason] = useState("");
    if (!r) return null;
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const why = reason.trim();
        await api.reservations.cancel(r.id, why);
        await refresh();
        closeModal();
        toast(`${r.name} cancelled`);
    };
    const tn = r.tableId ? tables.find((t) => t.id === r.tableId)?.name || "Deleted table" : "";
    return (
        <form id="cancel-form" onSubmit={submit}>
            <div className="m-body">
                <p>
                    {whenText(r.at)} · {r.pax} guests{tn ? " · " + tn : ""}. The table is freed. You can restore the
                    reservation later.
                </p>
                <label className="field">
                    <span>Reason (optional)</span>
                    <input
                        name="reason"
                        className="input"
                        maxLength={120}
                        autoComplete="off"
                        placeholder="Guest called to cancel"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </label>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Keep reservation
                </button>
                <button className="btn btn-danger">
                    <Icon name="x" size={20} />
                    Cancel reservation
                </button>
            </div>
        </form>
    );
}

export function SeatModal({ id, msg }: { id: string; msg: string }) {
    const r = useReservations().data.find((x) => x.id === id),
        tables = useTables().data,
        floors = useFloors().data;
    const opts = r ? tables.filter((t) => t.status === "inactive" && t.seats >= r.pax) : [];
    const [table, setTable] = useState("");
    if (!r) return null;
    const chosen = table && opts.some((t) => t.id === table) ? table : opts[0]?.id;
    return (
        <form
            id="seat-form"
            onSubmit={(e) => {
                e.preventDefault();
                if (chosen) seatAt(r, chosen);
            }}
        >
            <div className="m-body">
                {msg ? (
                    <div className="alert warn">
                        <Icon name="alert" />
                        <p>{msg}</p>
                    </div>
                ) : null}
                <p>
                    {r.pax} guests. Pick a free table. Its QR code appears next
                    {r.order?.length ? ", and the advance order goes on its plate" : ""}.
                </p>
                {opts.length ? (
                    <label className="field">
                        <span>Table</span>
                        <select
                            name="table"
                            className="input"
                            value={chosen}
                            onChange={(e) => setTable(e.target.value)}
                        >
                            {opts.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} · {t.seats} seats · {floors.find((f) => f.id === t.floor)?.name || ""}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : (
                    <div className="alert warn">
                        <Icon name="alert" />
                        <p>No free table with {r.pax} or more seats right now.</p>
                    </div>
                )}
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                {opts.length ? (
                    <button className="btn btn-primary">
                        <Icon name="qr" size={20} />
                        Seat and show QR
                    </button>
                ) : null}
            </div>
        </form>
    );
}

export function SeatedQrModal({ tableId }: { tableId: string }) {
    return <TableQr id={tableId} />;
}

export function JumpModal() {
    const [date, setDate] = useState(ymd(useResUi.getState().day));
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const t = parseAt(date, "00:00");
        if (isFinite(t)) useResUi.getState().set({ day: sod(t) });
        closeModal();
    };
    return (
        <form id="jump-form" onSubmit={submit}>
            <div className="m-body">
                <label className="field">
                    <span>Date</span>
                    <input
                        name="date"
                        className="input"
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </label>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary">Go</button>
            </div>
        </form>
    );
}
