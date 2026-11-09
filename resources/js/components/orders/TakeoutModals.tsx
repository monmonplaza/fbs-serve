import { useRef, useState } from "react";
import { api, ApiError } from "@/api-service";
import { Icon } from "@/components/Icon";
import { QrCode } from "@/components/QrCode";
import { TO } from "@/lib/constants";
import { useFoods, useInvalidate } from "@/hooks/useApi";
import type { TakeoutChannel } from "@/types/restaurant";
import { useUi } from "@/context/ui";
import { closeModal, openModal } from "@/context/modal";
import { toast } from "@/context/toast";
import { orderEta } from "@/lib/domain";
import { FoodPicker, draftItems, type Draft } from "@/components/orders/FoodPicker";
import { peso, sum } from "@/lib/format";
import { CHAN, takeoutLink } from "@/lib/ordersHelpers";

export const openTakeoutQr = () => openModal({ title: "Takeout QR code", content: <TakeoutQrModal /> });
export const openTakeoutCounter = () =>
    openModal({ title: "New takeout order", wide: true, content: <TakeoutCounterModal /> });

function TakeoutQrModal() {
    const link = takeoutLink();
    const copy = () => {
        const p = navigator.clipboard?.writeText(link);
        if (p)
            p.then(
                () => toast("Link copied"),
                () => toast("Select the link above and copy it"),
            );
        else toast("Select the link above and copy it");
    };
    const openGuest = () => {
        const ui = useUi.getState();
        ui.set({ mode: "guest" });
        ui.setGuest({ table: TO, tab: "menu" });
        closeModal();
        scrollTo(0, 0);
    };
    return (
        <>
            <div className="m-body">
                <div className="qr-box">
                    <QrCode text={link} label="QR code for takeout orders" />
                    <b>Scan to order takeout</b>
                    <span className="caption muted" style={{ wordBreak: "break-all", userSelect: "all" }}>
                        {link}
                    </span>
                </div>
                <p className="caption muted">
                    Print this and put it at the counter or the entrance. Customers order on their phone, get a pickup
                    number, and pay when they pick up. This code does not expire.
                </p>
            </div>
            <div className="m-foot">
                <button className="btn btn-outline" onClick={closeModal}>
                    Done
                </button>
                <button className="btn btn-outline" onClick={copy}>
                    Copy link
                </button>
                <button className="btn btn-primary" onClick={openGuest}>
                    <Icon name="phone" size={20} />
                    Open guest view
                </button>
            </div>
        </>
    );
}

/** Counter takeout: staff enter the name and pick food by category tab. Draft key is the food id, or "foodId|variantId" for a food with variants. */
function TakeoutCounterModal() {
    const foods = useFoods().data;
    const invalidate = useInvalidate();
    const [draft, setDraft] = useState<Draft>({});
    const [name, setName] = useState(""),
        [phone, setPhone] = useState(""),
        [ref, setRef] = useState("");
    const [channel, setChannel] = useState<TakeoutChannel>("walkin");
    const [busy, setBusy] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    const items = draftItems(draft, foods);
    const n = sum(items.map((i) => i.qty)),
        tot = sum(items.map((i) => i.price * i.qty));

    const place = async () => {
        if (!name.trim()) {
            toast("Enter the customer name first");
            nameRef.current?.focus();
            return;
        }
        setBusy(true);
        try {
            const o = await api.orders.placeTakeout(items, name, phone, channel, ref);
            useUi.getState().notify("bag", `New takeout ${o.pickup} from ${o.customer}`, "kitchen");
            closeModal();
            await invalidate("orders");
            toast(
                channel !== "walkin"
                    ? `${CHAN[channel].l} order ${o.pickup} sent to the kitchen.`
                    : `${o.pickup} sent to the kitchen. Pay on pickup.`,
            );
        } catch (e) {
            toast(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
            setBusy(false);
        }
    };

    return (
        <>
            <div className="m-body">
                <FoodPicker
                    foods={foods}
                    draft={draft}
                    setDraft={setDraft}
                    side={
                        <>
                            <div className="field">
                                <span>Order from</span>
                                <div className="chips" role="group" aria-label="Order from">
                                    {(Object.entries(CHAN) as [TakeoutChannel, { l: string }][]).map(([k, c]) => (
                                        <button
                                            key={k}
                                            type="button"
                                            className="chip"
                                            aria-pressed={channel === k}
                                            onClick={() => setChannel(k)}
                                        >
                                            {c.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {channel !== "walkin" && (
                                <label className="field">
                                    <span>{CHAN[channel].l} order no. (optional)</span>
                                    <input
                                        id="to-ref"
                                        className="input num"
                                        value={ref}
                                        onChange={(e) => setRef(e.target.value)}
                                        autoComplete="off"
                                        maxLength={24}
                                    />
                                </label>
                            )}
                            <label className="field">
                                <span>Customer name</span>
                                <input
                                    id="to-name"
                                    ref={nameRef}
                                    className="input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoComplete="off"
                                    maxLength={40}
                                />
                            </label>
                            <label className="field">
                                <span>Phone (optional)</span>
                                <input
                                    id="to-phone"
                                    className="input num"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    inputMode="tel"
                                    autoComplete="off"
                                    maxLength={20}
                                />
                                <span className="hint">To call or text when it’s ready.</span>
                            </label>
                            <b>Order</b>
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
                                    <span className="caption muted num">
                                        Ready in about {orderEta(items, foods)} min ·{" "}
                                        {channel === "walkin" ? "pay on pickup" : `paid in the ${CHAN[channel].l} app`}
                                    </span>
                                </>
                            ) : (
                                <p className="caption muted">No food yet. Pick from the tabs.</p>
                            )}
                        </>
                    }
                />
            </div>
            <div className="m-foot to-foot">
                <span className="grow caption muted num">
                    {n ? `${n} items · ${peso(tot)}` : "Add food to start the order."}
                </span>
                <button className="btn btn-outline" onClick={closeModal}>
                    Cancel
                </button>
                <button className="btn btn-primary" disabled={!n || busy} onClick={place}>
                    Send to kitchen{n ? " · " + peso(tot) : ""}
                </button>
            </div>
        </>
    );
}
