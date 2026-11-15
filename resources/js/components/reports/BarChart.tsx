import { useState, type ReactNode } from "react";
import { useWidth } from "@/hooks/useWidth";
import { axisPeso, ticks } from "@/lib/salesStats";

export interface Bar {
    key: string;
    /** The label under the bar. */
    label: string;
    value: number;
    /** What the hover (or tap) tooltip says. */
    tip: ReactNode;
}

const H = 220,
    TOP = 12,
    BOTTOM = 28,
    LEFT = 52;

/** A column chart of money per period: rounded 4px column tops from one baseline, a quiet grid, and a tooltip for each column. */
export function BarChart({ bars, ariaLabel }: { bars: Bar[]; ariaLabel: string }) {
    const [box, w] = useWidth();
    const [hover, setHover] = useState<number | null>(null);
    const yt = ticks(Math.max(0, ...bars.map((b) => b.value)));
    const top = yt[yt.length - 1];
    const band = bars.length ? (w - LEFT) / bars.length : 0;
    const bw = Math.min(24, Math.max(3, band - 2));
    const x = (i: number) => LEFT + i * band + band / 2;
    const y = (v: number) => TOP + (H - TOP - BOTTOM) * (1 - v / top);
    const base = y(0);
    // Label only every nth bar so the labels never run into each other.
    const every = Math.max(1, Math.ceil(48 / Math.max(band, 1)));
    const col = (i: number, v: number) => {
        const t = y(v),
            l = x(i) - bw / 2,
            r = Math.min(4, base - t);
        return `M${l},${base}V${t + r}Q${l},${t} ${l + r},${t}H${l + bw - r}Q${l + bw},${t} ${l + bw},${t + r}V${base}Z`;
    };
    const tipX = hover == null ? 0 : Math.min(Math.max(x(hover), 90), Math.max(90, w - 90));

    return (
        <div ref={box} className="chart-box" onMouseLeave={() => setHover(null)}>
            {w > 0 ? (
                <svg width={w} height={H} role="img" aria-label={ariaLabel}>
                    {yt.map((v) => (
                        <g key={v}>
                            <line x1={LEFT} x2={w} y1={y(v)} y2={y(v)} stroke="var(--hairline)" strokeWidth={1} />
                            <text x={LEFT - 8} y={y(v)} dy="0.32em" textAnchor="end" className="chart-axis">
                                {axisPeso(v, top)}
                            </text>
                        </g>
                    ))}
                    {bars.map((b, i) =>
                        b.value > 0 ? (
                            <path
                                key={b.key}
                                d={col(i, b.value)}
                                fill="var(--chart-1)"
                                opacity={hover == null || hover === i ? 1 : 0.45}
                            />
                        ) : null,
                    )}
                    <line x1={LEFT} x2={w} y1={base} y2={base} stroke="var(--border-control)" strokeWidth={1} />
                    {bars.map((b, i) =>
                        i % every === 0 ? (
                            <text
                                key={b.key}
                                x={Math.min(x(i), w - 20)}
                                y={H - 8}
                                textAnchor="middle"
                                className="chart-axis"
                            >
                                {b.label}
                            </text>
                        ) : null,
                    )}
                    {bars.map((b, i) => (
                        <rect
                            key={b.key}
                            x={x(i) - band / 2}
                            y={TOP}
                            width={band}
                            height={base - TOP}
                            fill="transparent"
                            onMouseEnter={() => setHover(i)}
                            onClick={() => setHover(i)}
                        />
                    ))}
                </svg>
            ) : null}
            {hover != null && bars[hover] ? (
                <div className="chart-tip" style={{ left: tipX, top: 4 }} role="status">
                    {bars[hover].tip}
                </div>
            ) : null}
        </div>
    );
}
