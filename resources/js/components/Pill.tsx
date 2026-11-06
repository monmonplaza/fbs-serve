import type { StatusMeta } from "@/lib/constants";
import { Icon } from "@/components/Icon";

export function Pill({ meta, withIcon = true }: { meta: StatusMeta; withIcon?: boolean }) {
    return (
        <span className={`pill p-${meta.c}`}>
            {withIcon && meta.i ? <Icon name={meta.i} size={16} /> : null}
            {meta.l}
        </span>
    );
}
