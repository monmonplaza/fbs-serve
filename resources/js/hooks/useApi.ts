import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api-service";
import type { SalesQuery } from "@/api-service/reports/mock";

/** One key per resource. Mutations call `invalidate('orders', 'tables')` so every screen showing that data refreshes. */
export const keys = {
    foods: ["foods"],
    categories: ["categories"],
    orders: ["orders"],
    tables: ["tables"],
    floors: ["floors"],
    reservations: ["reservations"],
    payments: ["payments"],
    discounts: ["discounts"],
    roles: ["roles"],
    users: ["users"],
    settings: ["settings"],
    ingredients: ["ingredients"],
    movements: ["movements"],
    plate: (tableId: string) => ["plate", tableId],
} as const;

const EMPTY: never[] = [];
function list<T>(key: readonly unknown[], fn: () => Promise<T[]>) {
    const q = useQuery({ queryKey: key, queryFn: fn });
    return { ...q, data: q.data ?? (EMPTY as T[]) };
}

export const useFoods = () => list(keys.foods, api.catalog.foods);
export const useCategories = () => list(keys.categories, api.catalog.categories);
export const useOrders = () => list(keys.orders, api.orders.list);
export const useTables = () => list(keys.tables, api.tables.list);
export const useFloors = () => list(keys.floors, api.tables.floors);
export const useReservations = () => list(keys.reservations, api.reservations.list);
export const usePayments = () => list(keys.payments, api.admin.payments);
export const useDiscounts = () => list(keys.discounts, api.admin.discounts);
export const useRoles = () => list(keys.roles, api.admin.roles);
export const useUsers = () => list(keys.users, api.admin.users);
export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: api.admin.settings }).data;
export const useIngredients = () => list(keys.ingredients, api.inventory.ingredients);
export const useMovements = () => list(keys.movements, () => api.inventory.movements());
/**
 * A sales report. Unlike the other lists it is not refreshed every few seconds: a report is a snapshot you ask for, and it can
 * be heavy. The previous report stays on screen while a new range loads.
 */
export const useSalesReport = (q: SalesQuery, enabled = true) =>
    useQuery({
        enabled,
        queryKey: ["reports", "sales", q],
        queryFn: () => api.reports.sales(q),
        refetchInterval: false,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
    });
export const usePlate = (tableId: string) => list(keys.plate(tableId), () => api.guest.plate(tableId));

type KeyName = Exclude<keyof typeof keys, "plate"> | "plate";
/** Refetch the named resources after a change. Pass no names to refetch everything. */
export function useInvalidate() {
    const qc = useQueryClient();
    return (...names: KeyName[]) =>
        names.length ? Promise.all(names.map((n) => qc.invalidateQueries({ queryKey: [n] }))) : qc.invalidateQueries();
}

/** The app's QueryClient, for code outside React components (for example a banner button handler). Set once in main.tsx. */
export const clientRef: { current: import("@tanstack/react-query").QueryClient | null } = { current: null };
export const invalidateOutside = (...names: KeyName[]) =>
    Promise.all(names.map((n) => clientRef.current?.invalidateQueries({ queryKey: [n] })));
