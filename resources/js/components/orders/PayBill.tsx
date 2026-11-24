import { useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import type { Order, Payment, PaymentMethod } from "@/types/restaurant";
import { closeModal } from "@/context/modal";
import { printBill } from "@/context/print";
import { guestDues } from "@/lib/guestPay";
import { peso } from "@/lib/format";
import { usePayName } from "@/lib/ordersHelpers";
import { PayForm } from "@/components/orders/PayForm";

interface Props {
    /** The unpaid orders of the bill. */
    orders: Order[];
    methods: PaymentMethod[];
    defaultMethod?: string;
    hint?: string;
    /** The bill as it is shown when it is paid together. */
    before: ReactNode;
    /** Pays the whole bill at once. */
    onPayAll: (discountId: string | null, pays: Payment[]) => Promise<void> | void;
    /** Pays one guest's dishes. Resolves true when that was the last guest (the window is then done). */
    onPayGuest: (guest: string, label: string, discountId: string | null, pay: Payment) => Promise<boolean>;
}

/**
 * Payment of a dine-in bill: all together, or guest by guest when the table has more than one guest. Once a guest has paid, the
 * rest of the bill is collected guest by guest too.
 */
export function PayBill({ orders, methods, defaultMethod, hint, before, onPayAll, onPayGuest }: Props) {
    const payName = usePayName();
    const dues = guestDues(orders);
    const started = dues.some((d) => d.paid.length > 0);
    const canSplit = dues.length > 1;
    const [mode, setMode] = useState<"all" | "guest">(started ? "guest" : "all");
    const [pick, setPick] = useState<string | null>(null);
    const view = started ? "guest" : mode;

    const toggle = canSplit ? (
        <div className="flex gap-2 mb-3" role="group" aria-label="How the table pays">
            {(
                [
                    ["all", "Pay together"],
                    ["guest", "Pay per guest"],
                ] as const
            ).map(([k, l]) => (
                <button
                    key={k}
                    type="button"
                    className="chip"
                    aria-pressed={view === k}
                    disabled={started && k === "all"}
                    onClick={() => {
                        setMode(k);
                        setPick(null);
                    }}
                >
                    {l}
                </button>
            ))}
        </div>
    ) : null;

    if (view === "all" || !canSplit)
        return (
            <PayForm
                orders={orders}
                methods={methods}
                defaultMethod={defaultMethod}
                hint={hint}
                printable
                before={
                    <>
                        {toggle}
                        {before}
                    </>
                }
                cancelLabel="Cancel"
                submitLabel="Payment received"
                onSubmit={onPayAll}
            />
        );

    const sel = dues.find((d) => d.share.key === pick && d.remaining > 0);
    if (sel) {
        // One guest's own payment: their dishes only, their own discount.
        const mine: Order = {
            ...orders[0],
            items: sel.share.lines.map((l) => ({ foodId: "", name: l.name, price: l.price, qty: l.qty })),
        };
        // Only what they have not paid for yet.
        const scale = sel.remaining / (sel.share.subtotal || 1);
        if (scale !== 1) mine.items = mine.items.map((i) => ({ ...i, price: i.price * scale }));
        return (
            <PayForm
                orders={[mine]}
                methods={methods}
                defaultMethod={defaultMethod}
                hint={hint}
                before={
                    <>
                        <p>
                            <b>{sel.share.label}</b> pays for their own dishes.
                        </p>
                        <ul className="items items-box">
                            {sel.share.lines.map((l) => (
                                <li key={l.name}>
                                    <b className="num">{l.qty}×</b>
                                    <span>{l.name}</span>
                                    <span className="num">{peso(l.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                }
                cancelLabel="Back"
                onCancel={() => setPick(null)}
                submitLabel={`${sel.share.label} paid`}
                onSubmit={async (disc, pays) => {
                    const closed = await onPayGuest(sel.share.key, sel.share.label, disc, pays[0]);
                    if (!closed) setPick(null);
                }}
            />
        );
    }

    const left = dues.filter((d) => d.remaining > 0).length;
    return (
        <>
            <div className="m-body">
                {toggle}
                <p className="caption muted" style={{ margin: "0 0 8px" }}>
                    Each guest pays for the dishes they added. {left} of {dues.length} still to pay. The table is done
                    when every guest has paid.
                </p>
                <div className="grid gap-3">
                    {dues.map((d) => (
                        <div key={d.share.key} className="card" style={{ padding: 12 }}>
                            <div className="flex items-baseline justify-between gap-2">
                                <b>{d.share.label}</b>
                                <b className="num">{peso(d.share.subtotal)}</b>
                            </div>
                            <ul className="items items-box">
                                {d.share.lines.map((l) => (
                                    <li key={l.name}>
                                        <b className="num">{l.qty}×</b>
                                        <span>{l.name}</span>
                                        <span className="num">{peso(l.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                            {d.paid.map((p, i) => (
                                <p key={i} className="caption" style={{ margin: "6px 0 0" }}>
                                    <span className="pill p-ok">Paid</span> {peso(p.amount)} with {payName(p.method)}
                                    {p.discount ? ` · ${p.discount.name} ${p.discount.pct}%` : ""}
                                </p>
                            ))}
                            {d.paid.length ? (
                                <div className="flex justify-end" style={{ marginTop: 8 }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => printBill({ orders, discount: null, guest: d.share.key })}
                                    >
                                        <Icon name="receipt" size={18} />
                                        Print receipt
                                    </button>
                                </div>
                            ) : null}
                            {d.remaining > 0 ? (
                                <div className="flex justify-end" style={{ marginTop: 8 }}>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => setPick(d.share.key)}
                                    >
                                        <Icon name="wallet" size={18} />
                                        {d.paid.length
                                            ? `Pay the rest ${peso(d.remaining)}`
                                            : `Receive ${peso(d.remaining)}`}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
            <div className="m-foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Close
                </button>
                <button type="button" className="btn btn-outline" onClick={() => printBill({ orders, discount: null })}>
                    <Icon name="receipt" size={20} />
                    Print bill
                </button>
            </div>
        </>
    );
}
