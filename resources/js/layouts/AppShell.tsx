import { useEffect, type ReactNode } from "react";
import { router, usePage } from "@inertiajs/react";
import { Icon } from "@/components/Icon";
import { GuestShell } from "@/components/guest/GuestShell";
import { NAV, KITCHEN } from "@/lib/constants";
import type { ModuleId } from "@/types/restaurant";
import { useOrders, useReservations, useTables, usePayments, useRoles, useUsers } from "@/hooks/useApi";
import { useUi } from "@/context/ui";
import { printBill } from "@/context/print";
import { useNow } from "@/hooks/useNow";
import { dueReservations, dueText } from "@/lib/reservations";
import { mins, tm } from "@/lib/format";
import { isTO } from "@/lib/domain";
import { LOGO, TopBar } from "@/components/TopBar";
import { useAllowed } from "@/lib/access";
import { openPayTable } from "@/pages/orders/OrdersPage";
import { dismissReservation, openReservation, openSeatReservation } from "@/pages/reservations/ReservationsPage";

/** Staff layout. Signed-out visitors go to /login; the guest phone preview replaces the staff screens while `mode` is 'guest'. */
export function AppShell({ children }: { children: ReactNode }) {
    const { mode, signedOut, meId } = useUi();
    const allowed = useAllowed();
    // The page component name is '<module>/<Module>Page'.
    const asked = usePage().component.split("/")[0] as ModuleId;
    // A module the role cannot open (typed URL, notification, menu) falls back to the first allowed one.
    // After a refresh the users and roles load a moment later: do not redirect until they are here.
    const users = useUsers().data,
        roles = useRoles().data;
    const ready = users.length > 0 && roles.length > 0;
    const view: ModuleId = !ready || allowed.includes(asked) ? asked : (allowed[0] ?? "guide");
    useEffect(() => {
        if (signedOut) router.visit("/login", { replace: true });
        else if (ready && view !== asked) router.visit("/" + view, { replace: true });
    }, [signedOut, ready, view, asked]);
    useEffect(() => {
        useUi.setState({ view });
    }, [view]);
    // A saved sign-in for a user that does not exist (any more) goes back to the login page.
    useEffect(() => {
        if (ready && !signedOut && !users.some((u) => u.id === meId)) useUi.setState({ signedOut: true });
    }, [ready, signedOut, users, meId]);
    if (signedOut) return null;
    if (mode === "guest")
        return (
            <>
                <TopBar brand />
                <GuestShell />
            </>
        );
    return <StaffFrame view={view}>{children}</StaffFrame>;
}

function StaffFrame({ view, children }: { view: ModuleId; children: ReactNode }) {
    const { go } = useUi();
    const allowed = useAllowed();
    const now = useNow(15000);
    const orders = useOrders().data,
        tables = useTables().data,
        reservations = useReservations().data,
        payments = usePayments().data;
    const bills = tables.filter((t) => t.status === "billout");
    const due = dueReservations(reservations, now);
    const badge: Partial<Record<ModuleId, number>> = {
        kitchen: orders.filter((o) => KITCHEN.includes(o.status)).length,
        tables: bills.length,
        orders: orders.filter((o) => isTO(o) && o.status === "ready").length,
        reservations: due.length,
    };
    const payName = (id?: string) => payments.find((p) => p.id === id)?.name || id || "";
    return (
        <div className="shell">
            <nav className="rail" aria-label="Modules" data-keep="rail">
                <div className="rail-brand">
                    {LOGO}
                    <span>
                        FBS Serve<small>Restaurant manager</small>
                    </span>
                </div>
                {NAV.filter((n) => allowed.includes(n.id)).map((n) => (
                    <button
                        key={n.id}
                        className="nav"
                        aria-current={view === n.id ? "page" : undefined}
                        onClick={() => go(n.id)}
                    >
                        <Icon name={n.ic} size={18} />
                        {n.label}
                        {badge[n.id] ? (
                            <span className="badge num" aria-label={`${badge[n.id]} waiting`}>
                                {badge[n.id]}
                            </span>
                        ) : null}
                    </button>
                ))}
            </nav>
            <main className="main">
                <TopBar brand={false} />
                <div className="wrap">
                    {allowed.includes("tables") &&
                        bills.map((t) => (
                            <div key={t.id} className="alert brand" role="alert">
                                <Icon name="bell" />
                                <p>
                                    <b>{t.name} is asking for the bill.</b> Pays with {payName(t.bill?.method)} ·{" "}
                                    {mins(t.bill?.at ?? now)} min ago
                                </p>
                                <button
                                    className="btn btn-outline"
                                    onClick={() =>
                                        printBill({
                                            orders: orders.filter(
                                                (o) => o.table === t.id && o.session === t.token && o.status !== "paid",
                                            ),
                                            discount: null,
                                            payWith: payments.find((p) => p.id === t.bill?.method) ?? null,
                                        })
                                    }
                                >
                                    <Icon name="receipt" size={20} />
                                    Print bill
                                </button>
                                <button className="btn btn-primary" onClick={() => openPayTable(t)}>
                                    Receive payment
                                </button>
                            </div>
                        ))}
                    {allowed.includes("reservations") &&
                        due.map((r) => {
                            const tn = tables.find((t) => t.id === r.tableId)?.name;
                            return (
                                <div key={r.id} className="alert rsv" role="alert">
                                    <Icon name="calendar" />
                                    <p>
                                        <b>
                                            Reservation at {tm(r.at)} · {r.name}.
                                        </b>{" "}
                                        {r.pax} guests · {tn ?? "no table yet"}
                                        {r.order?.length ? " · has an advance order" : ""} · {dueText(r, now)}
                                    </p>
                                    <button className="btn btn-primary" onClick={() => openSeatReservation(r.id)}>
                                        Seat now
                                    </button>
                                    <button className="btn btn-outline" onClick={() => openReservation(r.id)}>
                                        Open
                                    </button>
                                    <button
                                        className="icon-btn"
                                        aria-label="Got it, dismiss"
                                        onClick={() => dismissReservation(r.id)}
                                    >
                                        <Icon name="x" size={18} />
                                    </button>
                                </div>
                            );
                        })}
                    {children}
                </div>
                <footer className="foot">
                    <span>© 2026 Frontline Business Solutions</span>
                    <span>FBS Serve v1.0</span>
                </footer>
            </main>
        </div>
    );
}
