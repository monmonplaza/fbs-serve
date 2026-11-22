import type { Order } from "@/types/restaurant";
import { guestShares, hasBreakdown } from "@/lib/guestShares";
import { peso } from "@/lib/format";

/**
 * A table's bill split by guest: each guest's dishes with prices and their total. Shown only when the bill has more than one
 * part. `pct` is the discount to spread over the shares (0 shows amounts before any discount).
 */
export function GuestBreakdown({
    orders,
    pct = 0,
    me,
    collapsible = false,
}: {
    orders: Order[];
    pct?: number;
    /** The viewing guest's own name, marked "(you)". */
    me?: string;
    collapsible?: boolean;
}) {
    const shares = guestShares(orders, pct);
    if (!hasBreakdown(shares)) return null;
    const body = (
        <>
            <p className="caption muted" style={{ margin: "4px 0 8px" }}>
                Each guest’s own dishes.{" "}
                {pct ? `After the ${pct}% discount.` : "Prices include VAT, before any discount."}
            </p>
            <div className="grid gap-3">
                {shares.map((s) => (
                    <div key={s.key}>
                        <div className="flex items-baseline justify-between gap-2">
                            <b>
                                {s.label}
                                {me && s.key === me ? " (you)" : ""}
                            </b>
                            <b className="num">{peso(pct ? s.net : s.subtotal)}</b>
                        </div>
                        <ul className="items items-box">
                            {s.lines.map((l) => (
                                <li key={l.name}>
                                    <b className="num">{l.qty}×</b>
                                    <span>{l.name}</span>
                                    <span className="num">{peso(l.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </>
    );
    return collapsible ? (
        <details className="gb" style={{ marginTop: 8 }}>
            <summary className="label" style={{ cursor: "pointer" }}>
                Per guest ({shares.length})
            </summary>
            {body}
        </details>
    ) : (
        <section className="gb" aria-label="Per guest" style={{ marginTop: 12 }}>
            <h4>Per guest</h4>
            {body}
        </section>
    );
}
