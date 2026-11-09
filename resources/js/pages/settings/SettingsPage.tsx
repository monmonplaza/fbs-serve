import { api } from "@/api-service";
import type { SettingsList } from "@/api-service/admin/mock";
import {
    useCategories,
    useDiscounts,
    useFloors,
    useFoods,
    useInvalidate,
    usePayments,
    useRoles,
    useSettings,
    useTables,
    useUsers,
} from "@/hooks/useApi";
import { Pill } from "@/components/Pill";
import { TSTAT } from "@/lib/constants";
import { Icon } from "@/components/Icon";
import { usePaged } from "@/components/Pager";
import { RowActions } from "@/components/RowActions";
import { openModal, closeModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { SET, TAB_ORDER, cell, optsFor, type Opts, type Row } from "@/lib/settingsConfig";
import { SetModal } from "@/components/settings/SetModal";
import { useSettingsTab } from "@/hooks/useSettingsTab";

export { goToSettingsTab } from "@/hooks/useSettingsTab";

const TITLES: Record<string, string> = {
    ...Object.fromEntries(Object.entries(SET).map(([k, c]) => [k, c.title])),
    timer: "Table Timer",
};

export default function SettingsPage() {
    const stored = useSettingsTab((s) => s.tab),
        setTab = useSettingsTab((s) => s.setTab);
    const tab = TAB_ORDER.includes(stored as never) ? stored : "payments";
    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Settings</h1>
                    <p className="muted">
                        Payment methods, discounts, users, roles, food categories, tables, floor levels and the table
                        timer.
                    </p>
                </div>
            </div>
            <div className="tabs" role="tablist">
                {TAB_ORDER.map((k) => (
                    <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                        {TITLES[k]}
                    </button>
                ))}
            </div>
            {tab === "timer" ? <TimerCard /> : <SettingsList key={tab} list={tab as SettingsList} />}
        </>
    );
}

function TimerCard() {
    const s = useSettings(),
        invalidate = useInvalidate();
    if (!s) return null;
    const save = async (p: { tableTimerOn?: boolean; tableTimerMins?: number }) => {
        await api.admin.saveSettings(p);
        await invalidate("settings");
    };
    return (
        <section className="card" style={{ maxWidth: 520 }}>
            <div className="card-head">
                <h3>Table stay timer</h3>
            </div>
            <p className="caption muted">
                Flag a table once guests have been seated longer than the time limit you set. The waiter sees a
                notification on the table in <b>Tables</b>.
            </p>
            <label className="radio-card" style={{ marginTop: 12 }}>
                <input
                    type="checkbox"
                    checked={s.tableTimerOn}
                    onChange={(e) => save({ tableTimerOn: e.target.checked })}
                />
                <span className="grow">
                    <b>Turn on the stay timer</b>
                    <br />
                    <span className="caption muted">
                        Off by default. Guests can stay as long as they like until this is on.
                    </span>
                </span>
            </label>
            <label className="field" style={{ marginTop: 16, maxWidth: 200 }}>
                <span>Time limit (minutes)</span>
                <input
                    key={s.tableTimerMins}
                    className="input"
                    type="number"
                    min={1}
                    max={600}
                    defaultValue={s.tableTimerMins}
                    disabled={!s.tableTimerOn}
                    onBlur={(e) => save({ tableTimerMins: +e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                    }}
                />
            </label>
            {s.tableTimerOn ? (
                <p className="caption muted" style={{ marginTop: 8 }}>
                    A table is flagged {s.tableTimerMins} min after it is activated (guests seated), until it is
                    cleaned.
                </p>
            ) : null}
        </section>
    );
}

function SettingsList({ list }: { list: SettingsList }) {
    const cfg = SET[list],
        invalidate = useInvalidate();
    const data: Record<SettingsList, Row[]> = {
        payments: usePayments().data as unknown as Row[],
        discounts: useDiscounts().data as unknown as Row[],
        categories: useCategories().data as unknown as Row[],
        roles: useRoles().data as unknown as Row[],
        users: useUsers().data as unknown as Row[],
        tables: useTables().data as unknown as Row[],
        floors: useFloors().data as unknown as Row[],
    };
    const roles = useRoles().data,
        foods = useFoods().data,
        tables = useTables().data,
        floors = useFloors().data;
    const opts: Opts = optsFor(roles, floors);
    const extra = (r: Row) => {
        if (list === "tables") {
            const t = tables.find((x) => x.id === r.id);
            return t ? <Pill meta={TSTAT[t.status]} /> : null;
        }
        if (list === "floors") return <span className="num">{tables.filter((t) => t.floor === r.id).length}</span>;
        return <span className="num">{foods.filter((f) => f.cat === r.id).length}</span>;
    };
    const pg = usePaged(data[list], list);

    const del = async (r: Row) => {
        const block = await api.admin.deleteBlock(list, r.id);
        if (block) {
            openModal({
                title: `Can’t delete ${r.name}`,
                content: (
                    <>
                        <div className="m-body">
                            <div className="alert warn">
                                <Icon name="alert" />
                                <p>{block}</p>
                            </div>
                        </div>
                        <div className="m-foot">
                            <button className="btn btn-outline" onClick={closeModal}>
                                OK
                            </button>
                        </div>
                    </>
                ),
            });
            return;
        }
        openModal({
            title: `Delete ${cfg.one}?`,
            content: (
                <>
                    <div className="m-body">
                        <p>
                            <b>{r.name}</b> will be deleted.
                        </p>
                    </div>
                    <div className="m-foot">
                        <button className="btn btn-outline" onClick={closeModal}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={async () => {
                                try {
                                    await api.admin.deleteSetting(list, r.id);
                                    await invalidate(list, "tables", "floors");
                                    closeModal();
                                    toast("Deleted");
                                } catch (e) {
                                    toast(e instanceof Error ? e.message : "Could not delete");
                                }
                            }}
                        >
                            <Icon name="trash" size={20} />
                            Delete
                        </button>
                    </div>
                </>
            ),
        });
    };
    const edit = (r: Row | null) =>
        openModal({
            title: r ? `Edit ${r.name}` : `Add ${cfg.one}`,
            content: <SetModal list={list} row={r} opts={opts} />,
        });

    return (
        <>
            <div className="toolbar">
                <h2 style={{ flex: 1 }}>{cfg.title}</h2>
                <button className="btn btn-primary" onClick={() => edit(null)}>
                    <Icon name="plus" size={20} />
                    Add {cfg.one}
                </button>
            </div>
            <div className="tbl-scroll">
                <table className="data">
                    <thead>
                        <tr>
                            {cfg.fields.map((f) => (
                                <th key={f.k}>{f.l}</th>
                            ))}
                            {cfg.extra ? <th>{cfg.extra}</th> : null}
                            <th className="r">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pg.rows.map((r) => (
                            <tr key={r.id}>
                                {cfg.fields.map((f, i) => (
                                    <td key={f.k}>
                                        {i === 0 ? <b>{cell(f, r[f.k], opts)}</b> : cell(f, r[f.k], opts)}
                                    </td>
                                ))}
                                {cfg.extra ? <td>{extra(r)}</td> : null}
                                <td className="r" style={{ whiteSpace: "nowrap" }}>
                                    <RowActions
                                        actions={[
                                            {
                                                ic: "edit",
                                                label: "Edit",
                                                aria: `Edit ${r.name}`,
                                                onClick: () => edit(r),
                                            },
                                            {
                                                ic: "trash",
                                                label: "Delete",
                                                aria: `Delete ${r.name}`,
                                                danger: true,
                                                onClick: () => del(r),
                                            },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                        {!pg.rows.length ? (
                            <tr>
                                <td colSpan={9}>
                                    <div className="empty">Nothing here yet. Add the first {cfg.one}.</div>
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
            {pg.bar}
        </>
    );
}
