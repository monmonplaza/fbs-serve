import { api } from "@/api-service";
import { ItemNote } from "@/components/ItemNote";
import { ApiError } from "@/api-service";
import { Icon } from "@/components/Icon";
import { StatusDot } from "@/components/StatusDot";
import { useInvalidate, useOrders, usePayments, useTables } from "@/hooks/useApi";
import type { Order, OrderItem, Payment, PaymentMethod } from "@/types/restaurant";
import { useUi } from "@/context/ui";
import { closeModal, openModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { printBill } from "@/context/print";
import { aggregate, billKey, isTO, oMeta, orderTag, subtotal, total } from "@/lib/domain";
import { dt, peso, sum, tm } from "@/lib/format";
import { ChTag, chanOf, isPlatform, sod, usePayName, useTableName } from "@/lib/ordersHelpers";
import { PayForm } from "@/components/orders/PayForm";

const useMethods = (activeOnly: boolean): PaymentMethod[] => {
    const all = usePayments().data;
    if (!activeOnly) return all;
    const a = all.filter((x) => x.active);
    return a.length ? a : all;
};
const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");

/** One detail of an order: a small label above its value. */
function KV({ label, children }: { ic?: string; label: string; children: React.ReactNode }) {
    return (
        <div className="kvi">
            <span className="kvl">{label}</span>
            <span className="kvv">{children}</span>
        </div>
    );
}

function Items({ items }: { items: (Pick<OrderItem, "name" | "price" | "qty"> & { note?: string })[] }) {
    return (
        <ul className="items items-box">
            {items.map((i, k) => (
                <li key={k}>
                    <b className="num">{i.qty}×</b>
                    <span>
                        {i.name}
                        <ItemNote note={i.note} />
                    </span>
                    <span className="num">{peso(i.qty * i.price)}</span>
                </li>
            ))}
        </ul>
    );
}

/** All orders of one table session (the bill), oldest first. */
export function useBill(orderId: string) {
    const orders = useOrders().data;
    const o = orders.find((x) => x.id === orderId);
    if (!o) return { o: undefined, grp: [] as Order[] };
    const k = billKey(o, sod);
    return { o, grp: k ? orders.filter((x) => billKey(x, sod) === k).sort((a, b) => a.createdAt - b.createdAt) : [o] };
}

export const openPickup = (o: Order) =>
    openModal(
        isPlatform(o)
            ? { title: `Hand to rider · ${o.pickup}`, content: <HandoverModal id={o.id} /> }
            : { title: `Collect payment · ${o.pickup}`, content: <PickupModal id={o.id} /> },
    );

const isPayable = (o: Order, grp: Order[]) =>
    !isTO(o) &&
    grp.some((x) => x.status === "served") &&
    grp.every((x) => ["served", "paid"].includes(x.status)) &&
    grp.some((x) => x.status !== "paid");

/** Opens an order. `grp` is its whole bill (omit or pass [o] with solo for a single order). */
export function openOrder(o: Order, grp: Order[] = [o], solo = false) {
    const g = solo ? [o] : grp;
    openModal({
        title:
            !solo && isPayable(o, g) && g.length > 1
                ? o.code
                    ? orderTag(o, true)
                    : `${o.id} and ${g.length - 1} additional`
                : orderTag(o),
        content: <OrderModal id={o.id} solo={solo} />,
    });
}

/** Receive payment for a whole table (the "asking for the bill" banner). */
export function PayTableModal({ tableId }: { tableId: string }) {
    const t = useTables().data.find((x) => x.id === tableId);
    const orders = useOrders().data;
    const methods = useMethods(false);
    const payName = usePayName();
    const invalidate = useInvalidate();
    if (!t) return null;
    const os = t.token ? orders.filter((o) => o.table === t.id && o.session === t.token && o.status !== "paid") : [];
    return (
        <PayForm
            orders={os}
            methods={methods}
            defaultMethod={t.bill?.method}
            hint={`Guest chose ${payName(t.bill?.method)}.`}
            printable
            before={
                <ul className="items items-box">
                    {aggregate(os).map((i) => (
                        <li key={i.name}>
                            <b className="num">{i.qty}×</b>
                            <span>{i.name}</span>
                            <span className="num">{peso(i.qty * i.price)}</span>
                        </li>
                    ))}
                </ul>
            }
            cancelLabel="Cancel"
            submitLabel="Payment received"
            onSubmit={async (disc, pays) => {
                try {
                    await api.orders.payTable(t.id, disc, pays);
                    useUi.getState().notify("check", `${t.name} paid. Ready for cleanup`, "tables");
                    closeModal();
                    await invalidate("orders", "tables");
                    toast(`${t.name} paid. Clean the table, then mark it clean.`);
                } catch (e) {
                    fail(e);
                }
            }}
        />
    );
}

/** A takeout order paid on pickup. */
export function PickupModal({ id }: { id: string }) {
    const o = useOrders().data.find((x) => x.id === id);
    const methods = usePayments().data.filter((p) => p.active);
    const invalidate = useInvalidate();
    if (!o) return null;
    return (
        <PayForm
            orders={[o]}
            methods={methods}
            printable
            before={
                <>
                    <p>
                        <b>{o.customer}</b>
                        {o.phone ? (
                            <>
                                {" "}
                                · <span className="num">{o.phone}</span>
                            </>
                        ) : null}
                        <br />
                        <span className="caption muted num">{orderTag(o)} · takeout, paid on pickup</span>
                    </p>
                    <Items items={o.items} />
                </>
            }
            cancelLabel="Cancel"
            submitLabel="Paid and picked up"
            onSubmit={async (disc, pays: Payment[]) => {
                try {
                    await api.orders.payPickup(o.id, disc, pays);
                    closeModal();
                    await invalidate("orders");
                    toast(`${o.pickup} paid and picked up`);
                } catch (e) {
                    fail(e);
                }
            }}
        />
    );
}

/** GrabFood and Foodpanda orders are paid in the app, so the counter only hands the order to the rider. */
export function HandoverModal({ id }: { id: string }) {
    const o = useOrders().data.find((x) => x.id === id);
    const invalidate = useInvalidate();
    if (!o) return null;
    const c = chanOf(o);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.orders.handover(o.id);
            closeModal();
            await invalidate("orders");
            toast(`${o.pickup} handed to the ${c.l} rider`);
        } catch (err) {
            fail(err);
        }
    };
    return (
        <form id="hand-form" onSubmit={submit}>
            <div className="m-body">
                <p>
                    <ChTag o={o} />
                    <br />
                    <b>{o.customer}</b>
                    {o.ref ? (
                        <>
                            {" "}
                            · <span className="num">{o.ref}</span>
                        </>
                    ) : null}
                    <br />
                    <span className="caption muted num">{orderTag(o)}</span>
                </p>
                <Items items={o.items} />
                <div className="alert info">
                    <Icon name="wallet" />
                    <p>
                        <b>Already paid in the {c.l} app.</b>
                        <br />
                        <span className="caption">Give the order to the rider. Do not collect payment.</span>
                    </p>
                </div>
                <div className="sum">
                    <div className="total">
                        <span>Order total</span>
                        <span className="num">{peso(subtotal(o))}</span>
                    </div>
                </div>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary">
                    <Icon name="check" size={20} />
                    Handed to rider
                </button>
            </div>
        </form>
    );
}

/** One order or a whole table bill. A served dine-in bill can be paid right here. */
export function OrderModal({ id, solo = false }: { id: string; solo?: boolean }) {
    const allMethods = usePayments().data;
    const { o, grp: bill } = useBill(id);
    const tables = useTables().data;
    const methods = useMethods(true);
    const payName = usePayName(),
        tName = useTableName();
    const invalidate = useInvalidate();
    if (!o) return null;
    const grp = solo ? [o] : bill,
        many = grp.length > 1;
    const payable = !solo && isPayable(o, grp);
    const t = tables.find((x) => x.id === o.table);
    const unpaid = grp.filter((x) => x.status !== "paid");
    const breakdown = o.payments && o.payments.length > 1 ? o.payments : null;

    const details = (
        <>
            <div className="kvg">
                <KV label="Status">
                    <StatusDot meta={oMeta(o)} />
                </KV>
                {isTO(o) ? (
                    <>
                        <KV label="Order from">
                            <ChTag o={o} />
                        </KV>
                        {o.ref ? (
                            <KV label={`${chanOf(o).l} order no.`}>
                                <span className="num">{o.ref}</span>
                            </KV>
                        ) : null}
                        <KV label="Type">
                            Takeout,{" "}
                            {isPlatform(o)
                                ? "entered by staff"
                                : o.source === "qr"
                                  ? "from the Takeout QR"
                                  : "at the counter"}
                        </KV>
                        <KV label="Pickup number">
                            <span className="num">{o.pickup}</span>
                        </KV>
                        <KV label="Customer">
                            {o.customer}
                            {o.phone ? (
                                <>
                                    {" "}
                                    · <span className="num">{o.phone}</span>
                                </>
                            ) : null}
                        </KV>
                    </>
                ) : (
                    <KV label="Table">{tName(o.table)}</KV>
                )}
                <KV label="Ordered">
                    <span className="num">
                        {dt(o.createdAt)}, {tm(o.createdAt)}
                    </span>
                </KV>
                {isTO(o) ? null : <KV label="Sent by">{o.by}</KV>}
                {o.payment ? (
                    <KV label="Payment">
                        {payName(o.payment)}
                        {breakdown ? (
                            <>
                                <br />
                                <span className="caption muted num">
                                    {breakdown.map((p, i) => (
                                        <span key={i}>
                                            {i ? <br /> : null}
                                            {payName(p.method)} {peso(p.amount)}
                                        </span>
                                    ))}
                                </span>
                            </>
                        ) : null}
                    </KV>
                ) : null}
                {o.payRef ? (
                    <KV label="Reference no.">
                        <span className="num">{o.payRef}</span>
                    </KV>
                ) : null}
                {o.discount ? (
                    <KV label="Discount">
                        {o.discount.name} ({o.discount.pct}%)
                    </KV>
                ) : null}
            </div>
            {many ? (
                grp.map((x, i) => (
                    <div key={x.id}>
                        <p className="caption muted num" style={{ margin: "8px 0 2px" }}>
                            {x.code ? orderTag(x) : `${x.id} · ${i ? "Additional order" : "First order"}`} ·{" "}
                            {oMeta(x).l}
                        </p>
                        <Items items={x.items} />
                    </div>
                ))
            ) : (
                <Items items={o.items} />
            )}
            {many && !payable && !solo && !isTO(o) && grp.some((x) => x.status !== "paid") ? (
                <p className="caption muted">One bill for the whole table. Payment opens once every order is served.</p>
            ) : null}
        </>
    );

    if (payable) {
        return (
            <PayForm
                orders={unpaid}
                methods={methods}
                defaultMethod={t?.bill?.method}
                printable
                hint={t?.bill ? `Guest chose ${payName(t.bill.method)}.` : undefined}
                before={details}
                cancelLabel="Close"
                submitLabel="Payment received"
                onSubmit={async (disc, pays) => {
                    try {
                        const r = await api.orders.payBill(o.id, disc, pays);
                        const split = pays.length > 1;
                        closeModal();
                        await invalidate("orders", "tables");
                        const cleaning = r.table?.status === "cleaning";
                        toast(
                            `${r.count > 1 ? `${r.count} orders` : orderTag(o)} paid${split ? " with a split bill" : " with " + payName(pays[0].method)}${cleaning ? `. ${r.table!.name} is ready to clean.` : ""}`,
                        );
                    } catch (e) {
                        fail(e);
                    }
                }}
            />
        );
    }
    const sub = sum(grp.map(subtotal)),
        tot = sum(grp.map(total));
    return (
        <>
            <div className="m-body">
                {details}
                <div className="sum">
                    <div>
                        <span className="muted">Subtotal</span>
                        <span className="num">{peso(sub)}</span>
                    </div>
                    {o.discount ? (
                        <div>
                            <span className="muted">Discount</span>
                            <span className="num">−{peso(sub - tot)}</span>
                        </div>
                    ) : null}
                    <div className="total">
                        <span>Total</span>
                        <span className="num">{peso(tot)}</span>
                    </div>
                    {o.received != null ? (
                        <>
                            <div>
                                <span className="muted">Amount received</span>
                                <span className="num">{peso(o.received)}</span>
                            </div>
                            <div>
                                <span className="muted">Change</span>
                                <span className="num">{peso(o.change ?? 0)}</span>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
            <div className="m-foot">
                <button className="btn btn-outline" onClick={closeModal}>
                    Close
                </button>
                {grp.every((x) => x.status === "paid") ? (
                    <button
                        className="btn btn-outline"
                        onClick={() =>
                            printBill({
                                orders: grp,
                                discount: o.discount ?? null,
                                payWith: allMethods.find((m) => m.id === o.payment && m.qr) ?? null,
                            })
                        }
                    >
                        <Icon name="receipt" size={20} />
                        Print receipt
                    </button>
                ) : null}
                {isTO(o) && o.status === "ready" ? (
                    <button className="btn btn-primary" onClick={() => openPickup(o)}>
                        <Icon name={isPlatform(o) ? "bag" : "wallet"} size={20} />
                        {isPlatform(o) ? "Hand to rider" : "Collect payment"}
                    </button>
                ) : null}
            </div>
        </>
    );
}
