import { NAV } from "@/lib/constants";
import type { ModuleId } from "@/types/restaurant";
import { useRoles, useUsers } from "@/hooks/useApi";
import { useUi } from "@/context/ui";

/**
 * Modules the signed-in user may open, from the role's "modules" list in Settings.
 * Admin always keeps every module so nobody can lock themselves out of Settings.
 * UI-only for now: the backend must enforce the same rule per request (docs/BACKEND.md).
 */
export function useAllowed(): ModuleId[] {
    const meId = useUi((s) => s.meId);
    const me = useUsers().data.find((u) => u.id === meId);
    const role = useRoles().data.find((r) => r.id === me?.role);
    if (me?.role === "admin") return NAV.map((n) => n.id);
    const ids = role?.modules ?? [];
    return NAV.map((n) => n.id).filter((id) => ids.includes(id));
}
