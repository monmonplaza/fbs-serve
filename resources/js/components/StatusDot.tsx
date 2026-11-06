import type { StatusMeta, Tone } from "@/lib/constants";

const COLOR: Record<Tone, string> = {
    neutral: "var(--disabled-ink)",
    info: "var(--info)",
    warn: "var(--warning)",
    ok: "var(--success)",
    accent: "var(--accent-ink)",
    purple: "var(--purple)",
    error: "var(--error)",
    reserved: "var(--reserved)",
};

/** A status as a colored dot plus its label, for places where a filled pill is too heavy. */
export function StatusDot({ meta }: { meta: StatusMeta }) {
    return (
        <span className="sdot" style={{ color: COLOR[meta.c] }}>
            <i aria-hidden="true" />
            {meta.l}
        </span>
    );
}
