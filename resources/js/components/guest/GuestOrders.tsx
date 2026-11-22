import type { Order } from "@/types/restaurant";
import { ItemNote } from "@/components/ItemNote";
import { GSTEPS, GSTEP_L, OSTAT, TO_STEPS, TO_STEP_L } from "@/lib/constants";
import { Icon } from "@/components/Icon";
import { useNow } from "@/hooks/useNow";
import { mins, peso, sum, tm } from "@/lib/format";
import { useUi } from "@/context/ui";
import { oMeta, orderEta, orderTag, total } from "@/lib/domain";

function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
    return (
        <div className="center">
            <div className="big-ic">
                <Icon name={icon} size={32} />
            </div>
            <h3>{title}</h3>
            <p className="muted">{text}</p>
        </div>
    );
}

function Track({ o, takeout }: { o: Order; takeout: boolean }) {
    const steps = takeout ? TO_STEPS : GSTEPS,
        labels = takeout ? TO_STEP_L : GSTEP_L;
    const k = steps.indexOf(o.status),
        m = takeout ? oMeta(o) : OSTAT[o.status]!;
    const done = takeout ? o.status === "paid" : o.status === "served";
    const left = (o.eta || orderEta(o.items, [])) - mins(o.createdAt);
    return (
        <section className="card track" style={{ padding: 16 }}>
            <span className="caption muted num">
                {orderTag(o)} · {tm(o.createdAt)} · {takeout ? o.customer : `sent by ${o.by}`}
            </span>
            {takeout && (
                <div className="pickup">
                    <span className="caption muted">Pickup number</span>
                    <b className="num">{o.pickup}</b>
                </div>
            )}
            <h3>{m.g}</h3>
            <p className="caption muted">{m.d}</p>
            {["queued", "cooking", "plating"].includes(o.status) && (
                <span className="pill p-info" style={{ alignSelf: "flex-start" }}>
                    <Icon name="clock" size={16} />
                    {left > 0 ? `Ready in about ${left} min` : "Almost ready"}
                </span>
            )}
            <div className="prog" style={{ gridTemplateColumns: `repeat(${steps.length},1fr)` }} aria-hidden="true">
                {steps.map((s, i) => (
                    <i key={s} className={i <= k ? "on" : ""} />
                ))}
            </div>
            <ol className="steps">
                {labels.map((l, i) => {
                    const dn = i < k || done;
                    return (
                        <li key={l} className={dn ? "done" : i === k ? "now" : ""}>
                            <span className="dot">{dn ? <Icon name="check" /> : null}</span>
                            {l}
                        </li>
                    );
                })}
            </ol>
            <ul className="items">
                {o.items.map((i, x) => (
                    <li key={x}>
                        <b className="num">{i.qty}×</b>
                        <span>
                            {i.name}
                            <ItemNote note={i.note} />
                        </span>
                        <span className="num">{peso(i.qty * i.price)}</span>
                    </li>
                ))}
            </ul>
            {takeout && (
                <div className="sum">
                    <div className="total">
                        <span>{done ? "Paid" : "Pay at pickup"}</span>
                        <span className="num">{peso(total(o))}</span>
                    </div>
                </div>
            )}
        </section>
    );
}

/** What this guest added themselves across the table's orders: the dishes, their prices and their own total. */
export function mineOf(orders: Order[], me: string) {
    return orders
        .flatMap((o) =>
            o.items.flatMap((i) => {
                const qty = i.addedBy?.[me] ?? 0;
                return qty > 0 ? [{ o, i, qty }] : [];
            }),
        )
        .sort((a, b) => b.o.createdAt - a.o.createdAt);
}

/** "Your items": every dish this guest added, with its price, and the total of their own dishes (so a table can split the bill). */
function YourItems({ orders, me }: { orders: Order[]; me: string }) {
    const mine = mineOf(orders, me);
    if (!mine.length) return null;
    const total = sum(mine.map(({ i, qty }) => i.price * qty));
    const count = sum(mine.map((m) => m.qty));
    return (
        <section className="card" style={{ padding: 16 }} aria-label="Your items">
            <div className="flex items-baseline justify-between gap-2">
                <h3>Your items</h3>
                <span className="caption muted">{me}</span>
            </div>
            <p className="caption muted">
                What you added yourself, {count} {count === 1 ? "dish" : "dishes"}. Prices include VAT, before any
                discount.
            </p>
            <ul className="items">
                {mine.map(({ o, i, qty }, x) => {
                    const m = OSTAT[o.status];
                    return (
                        <li key={x} style={{ alignItems: "flex-start" }}>
                            <b className="num">{qty}×</b>
                            <span>
                                {i.name}
                                <ItemNote note={i.note} />
                                <span className="caption muted num" style={{ display: "block" }}>
                                    {peso(i.price)} each{m ? ` · ${m.l}` : ""}
                                </span>
                            </span>
                            <span className="num">{peso(qty * i.price)}</span>
                        </li>
                    );
                })}
            </ul>
            <div className="sum">
                <div className="total">
                    <span>Your total so far</span>
                    <span className="num">{peso(total)}</span>
                </div>
            </div>
        </section>
    );
}

/** Orders the table's session has sent (dine-in), or the takeout orders this phone placed. */
export function GuestOrders({ orders, takeout }: { orders: Order[]; takeout: boolean }) {
    useNow(30000);
    const me = useUi((s) => s.guest.name);
    const os = [...orders].sort((a, b) => b.createdAt - a.createdAt);
    const hasMine = !takeout && mineOf(orders, me).length > 0;
    if (!os.length)
        return takeout ? (
            <Empty
                icon="clock"
                title="No takeout orders yet"
                text="Place an order from your plate. You can follow it here."
            />
        ) : (
            <Empty icon="clock" title="No orders yet" text="Send your plate to the kitchen to start an order." />
        );
    return (
        <>
            {takeout ? null : <YourItems orders={orders} me={me} />}
            {hasMine ? <h4 style={{ marginTop: 4 }}>All orders at your table</h4> : null}
            {os.map((o) => (
                <Track key={o.id} o={o} takeout={takeout} />
            ))}
        </>
    );
}
