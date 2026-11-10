import { useState } from "react";
import { api, ApiError } from "@/api-service";
import { useInvalidate } from "@/hooks/useApi";
import { useUi } from "@/context/ui";
import { Icon } from "@/components/Icon";
import { saveKey } from "@/lib/guestLink";
import type { DiningTable } from "@/types/restaurant";

/** The printed table QR never changes, so a phone joins the seated group with the 4-digit code from the waiter. */
export function CodeEntry({ t }: { t: DiningTable }) {
    const invalidate = useInvalidate();
    const setGuest = useUi((s) => s.setGuest);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 4 || busy) return;
        setBusy(true);
        setError("");
        try {
            const token = await api.guest.enterCode(t.id, code);
            saveKey(t.id, token);
            setGuest({ key: token, tab: "menu" });
            await invalidate("plate", "orders", "tables");
        } catch (err) {
            setError(
                err instanceof ApiError && err.status === 429
                    ? "Too many tries. Wait a minute, then ask your waiter for the code."
                    : err instanceof Error
                      ? err.message
                      : "Something went wrong. Please try again.",
            );
            setBusy(false);
        }
    };

    return (
        <form className="center" onSubmit={submit} noValidate>
            <div className="big-ic">
                <Icon name="qr" size={32} />
            </div>
            <h3>Enter the table code</h3>
            <p className="muted">Your waiter has a 4-digit code for {t.name}. Enter it to see the menu and order.</p>
            <label className="field" style={{ width: "100%", maxWidth: 240, marginTop: 16 }}>
                <span className="sr-only">Table code</span>
                <input
                    className="input num text-center text-[28px]! tracking-[0.4em] font-semibold"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="0000"
                    autoFocus
                    value={code}
                    aria-invalid={!!error}
                    aria-describedby={error ? "code-err" : undefined}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
            </label>
            {error ? (
                <p className="hint bad" id="code-err" role="alert" style={{ marginTop: 8 }}>
                    {error}
                </p>
            ) : null}
            <button
                className="btn btn-primary"
                style={{ marginTop: 16, minWidth: 200 }}
                disabled={code.length !== 4 || busy}
            >
                {busy ? "Checking…" : "Start ordering"}
            </button>
        </form>
    );
}
