/**
 * @file api-service/admin/http.ts
 * Settings lists that the Laravel backend owns: payment methods, discounts, roles, users, categories, tables, floors and the table timer.
 */

// Every list has an endpoint now; the mock spread only keeps the list type and `foodCounts` shape in one place.
import { http, unwrap } from "@/api-service/client";
import { admin as mock, type SettingsList } from "@/api-service/admin/mock";
import type { AppSettings, Discount, Food, PaymentMethod, Role, User } from "@/types/restaurant";

const PATH: Partial<Record<SettingsList, string>> = {
    payments: "/payment-methods",
    discounts: "/discounts",
    roles: "/roles",
    users: "/users",
    categories: "/categories",
    tables: "/tables",
    floors: "/floors",
};

/** Fields the forms collect, shaped like the mock does (see admin.ts saveSetting). */
function body(list: SettingsList, v: Record<string, unknown>) {
    if (list === "tables")
        return {
            name: String(v.name),
            seats: Math.min(40, Math.max(1, +(v.seats as number) || 1)),
            floor: String(v.floor),
        };
    return v;
}

export const adminHttp = {
    ...mock,
    payments: async () => unwrap<PaymentMethod[]>(await http.get("/payment-methods")),
    roles: async () => unwrap<Role[]>(await http.get("/roles")),
    users: async () => unwrap<User[]>(await http.get("/users")),
    updateProfile: async (id: string, p: { name: string }) => unwrap<User>(await http.post(`/users/${id}`, p)),
    discounts: async () => unwrap<Discount[]>(await http.get("/discounts")),
    settings: async () => unwrap<AppSettings>(await http.get("/settings")),
    saveSettings: async (p: Partial<AppSettings>) => unwrap<AppSettings>(await http.patch("/settings", p)),
    saveSetting: async (list: SettingsList, id: string | null, v: Record<string, unknown>) => {
        const path = PATH[list];
        if (!path) return mock.saveSetting(list, id, v);
        return unwrap<unknown>(await http.post(id ? `${path}/${id}` : path, body(list, v)));
    },
    /** The server refuses a delete that is blocked and says why, so nothing is checked up front for these lists. */
    deleteBlock: async (list: SettingsList, id: string) => (PATH[list] ? "" : mock.deleteBlock(list, id)),
    deleteSetting: async (list: SettingsList, id: string) => {
        const path = PATH[list];
        if (!path) return mock.deleteSetting(list, id);
        await http.delete(`${path}/${id}`);
    },
    foodCounts: async () => {
        const m: Record<string, number> = {};
        unwrap<Food[]>(await http.get("/foods")).forEach((f) => {
            m[f.cat] = (m[f.cat] || 0) + 1;
        });
        return m;
    },
};
