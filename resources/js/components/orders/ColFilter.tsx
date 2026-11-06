import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clamp } from "@/lib/format";
import { cfBlank, type Col, type ColValue } from "@/lib/ordersColumns";

interface Props {
    col: Col;
    value: ColValue;
    /** Distinct values of this column in the current view, with how many orders have each. */
    counts: Map<string, number>;
    onChange: (v: ColValue) => void;
    onClose: (refocus?: boolean) => void;
}

/** Floating filter panel under a column header button. Kept in place while the table re-renders or the page scrolls. */
export function ColFilter({ col: c, value: v, counts, onChange, onClose }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const anchor = () => document.querySelector<HTMLElement>(`[data-col-filter="${c.k}"]`);

    const place = () => {
        const el = anchor(),
            pop = ref.current;
        if (!el || !pop) return onClose();
        const r = el.getBoundingClientRect(),
            w = pop.offsetWidth,
            h = pop.offsetHeight;
        if (r.bottom < 0 || r.top > innerHeight) return onClose();
        pop.style.left = clamp(r.left, 8, innerWidth - w - 8) + "px";
        pop.style.top = (r.bottom + 6 + h > innerHeight - 8 ? Math.max(8, r.top - h - 6) : r.bottom + 6) + "px";
    };
    useLayoutEffect(place);
    useEffect(() => {
        ref.current?.querySelector("input")?.focus({ preventScroll: true });
        const down = (e: MouseEvent) => {
            const t = e.target as Element;
            if (!ref.current?.contains(t) && !t.closest?.("[data-col-filter]")) onClose();
        };
        const key = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose(true);
        };
        addEventListener("scroll", place, true);
        addEventListener("resize", place);
        document.addEventListener("mousedown", down);
        document.addEventListener("keydown", key);
        return () => {
            removeEventListener("scroll", place, true);
            removeEventListener("resize", place);
            document.removeEventListener("mousedown", down);
            document.removeEventListener("keydown", key);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [c.k]);

    let body;
    if (Array.isArray(v)) {
        const m = new Map(counts);
        v.forEach((x) => m.has(x) || m.set(x, 0));
        const opts = [...m];
        if (c.k !== "day") opts.sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true }));
        body = (
            <>
                <span className="caption muted">Show only</span>
                <div className="cf-list">
                    {opts.map(([x, n]) => (
                        <label key={x} className="cf-opt">
                            <input
                                type="checkbox"
                                value={x}
                                checked={v.includes(x)}
                                onChange={(e) => onChange(e.target.checked ? [...v, x] : v.filter((y) => y !== x))}
                            />
                            <span className="grow">{x}</span>
                            <span className="caption muted num">{n}</span>
                        </label>
                    ))}
                    {!opts.length && <span className="caption muted">No values in this view.</span>}
                </div>
            </>
        );
    } else if (typeof v === "object") {
        body = (
            <div className="cf-range">
                {(["min", "max"] as const).map((e) => (
                    <label key={e} className="field">
                        <span>
                            {e === "min" ? "Min" : "Max"}
                            {c.r ? " (₱)" : ""}
                        </span>
                        <input
                            className="input num"
                            type="number"
                            min={0}
                            inputMode="decimal"
                            value={v[e]}
                            onChange={(ev) => onChange({ ...v, [e]: ev.target.value })}
                        />
                    </label>
                ))}
            </div>
        );
    } else {
        body = (
            <label className="field">
                <span>Contains</span>
                <input
                    className="input num"
                    value={v}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="e.g. 1042"
                    autoComplete="off"
                />
            </label>
        );
    }
    return createPortal(
        <div
            ref={ref}
            id="colpop"
            className="colpop"
            role="dialog"
            aria-label={"Filter " + c.l}
            style={{ left: 0, top: 0 }}
        >
            <b>Filter: {c.l}</b>
            {body}
            <div className="cf-foot">
                <button className="btn btn-ghost" onClick={() => onChange(cfBlank(c))}>
                    Clear
                </button>
                <button className="btn btn-primary" onClick={() => onClose(true)}>
                    Done
                </button>
            </div>
        </div>,
        document.body,
    );
}
