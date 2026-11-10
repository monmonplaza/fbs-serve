import type { DiningTable, Order } from "@/types/restaurant";
import { KITCHEN } from "@/lib/constants";
import { usePayments } from "@/hooks/useApi";
import { Icon } from "@/components/Icon";
import { aggregate, total } from "@/lib/domain";
import { peso, sum } from "@/lib/format";
import { openModal } from "@/context/modal";
import { BillModal } from "@/components/guest/GuestModals";

/** `paid`: this phone was part of the group that just paid (a phone that never joined sees "not active yet" instead). */
export function GuestClosed({ t, paid = true }: { t: DiningTable; paid?: boolean }) {
    if (t.status === "cleaning" && paid)
        return (
            <div className="center" style={{ paddingTop: 48 }}>
                <div className="big-ic">
                    <Icon name="check" size={32} />
                </div>
                <h2>Thank you!</h2>
                <p>
                    <b>Payment received for {t.name}.</b>
                </p>
                <p className="muted">
                    We hope you enjoyed your meal at FBS Serve. We would love to see you again. This table QR is now
                    closed.
                </p>
            </div>
        );
    return (
        <div className="center">
            <div className="big-ic">
                <Icon name="qr" size={32} />
            </div>
            <h3>{t.name} is not active yet</h3>
            <p className="muted">Ask your waiter to activate this table and give you the table code.</p>
        </div>
    );
}

export function GuestBill({ t, orders }: { t: DiningTable; orders: Order[] }) {
    const payments = usePayments().data,
        tot = sum(orders.map(total));
    if (t.status === "billout") {
        const id = t.bill?.method ?? "";
        const method = payments.find((p) => p.id === id);
        const name = id === "split" ? "Split bill" : method?.name || id;
        return (
            <div className="center">
                <div className="big-ic">
                    <Icon name="bell" size={32} />
                </div>
                <h3>Your waiter is on the way</h3>
                <p className="muted">
                    You chose {name}. Total <b className="num">{peso(tot)}</b>.
                </p>
                <p className="caption muted">
                    Discounts like senior citizen or PWD are applied by the waiter. Have your ID ready.
                </p>
            </div>
        );
    }
    if (!orders.length)
        return (
            <div className="center">
                <div className="big-ic">
                    <Icon name="wallet" size={32} />
                </div>
                <h3>Nothing to pay yet</h3>
                <p className="muted">Your bill appears here after you order.</p>
            </div>
        );
    const waiting = orders.some((o) => KITCHEN.includes(o.status));
    return (
        <>
            <h3>Your bill</h3>
            <div className="card" style={{ padding: 16 }}>
                <ul className="items">
                    {aggregate(orders).map((i) => (
                        <li key={i.name}>
                            <b className="num">{i.qty}×</b>
                            <span>{i.name}</span>
                            <span className="num">{peso(i.qty * i.price)}</span>
                        </li>
                    ))}
                </ul>
                <div className="sum" style={{ marginTop: 12 }}>
                    <div className="total">
                        <span>Total</span>
                        <span className="num">{peso(tot)}</span>
                    </div>
                </div>
            </div>
            {waiting && (
                <div className="alert warn">
                    <Icon name="alert" />
                    <p className="caption">You can ask for the bill once all your food is served.</p>
                </div>
            )}
            <button
                className="btn btn-primary block"
                disabled={waiting}
                onClick={() => openModal({ title: "Bill out", content: <BillModal tableId={t.id} /> })}
            >
                <Icon name="bell" size={20} />
                Bill out
            </button>
        </>
    );
}
