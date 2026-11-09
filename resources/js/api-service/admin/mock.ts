/**
 * @file api-service/admin/mock.ts
 * Settings: payment methods, discounts, categories, roles, users and the table timer.
 */

import { db } from "@/api-service/mock/db";
import { out, fail, uid } from "@/api-service/mock/core";
import type { AppSettings } from "@/types/restaurant";
import { tables } from "@/api-service/tables/mock";

export type SettingsList = "payments" | "discounts" | "categories" | "roles" | "users" | "tables" | "floors";
export type SettingsRow = Record<string, unknown> & { id: string; name: string };

const rows = (list: SettingsList) => db[list] as unknown as SettingsRow[];

/** What the profile page saves. */
export interface ProfileInput {
    name: string;
    email: string;
    phone: string;
    address: string;
    /** Photo URL, or "" for none. */
    avatar: string;
}
const mockPasswords = new Map<string, string>();

export const admin = {
    /** The user's own profile page. Empty fields clear the value. */
    saveProfile: async (id: string, p: ProfileInput) => {
        const u = db.users.find((x) => x.id === id) ?? fail("User not found");
        if (!p.name.trim()) fail("Enter your name");
        const email = p.email.trim();
        if (email && db.users.some((x) => x.id !== id && x.email?.toLowerCase() === email.toLowerCase()))
            fail("Another user already has that email.");
        if (!/^[0-9+()\-\s]*$/.test(p.phone))
            fail("The contact number can only have numbers, spaces, +, - and brackets.");
        Object.assign(u, {
            name: p.name.trim(),
            email: email || undefined,
            phone: p.phone.trim() || undefined,
            address: p.address.trim() || undefined,
            avatar: p.avatar || undefined,
        });
        return out(u);
    },
    /** Sets a new password. Once one exists, the current one is needed. The mock keeps passwords in memory only. */
    changePassword: async (id: string, current: string, next: string, confirm: string) => {
        const u = db.users.find((x) => x.id === id) ?? fail("User not found");
        const had = mockPasswords.get(id);
        if (had !== undefined && had !== current) fail("The current password is not correct.");
        if (next.length < 8) fail("Use at least 8 characters.");
        if (next !== confirm) fail("The new passwords do not match.");
        mockPasswords.set(id, next);
        u.hasPassword = true;
        return out(u);
    },
    payments: async () => out(db.payments),
    discounts: async () => out(db.discounts),
    roles: async () => out(db.roles),
    users: async () => out(db.users),
    settings: async () => out(db.settings),
    saveSettings: async (p: Partial<AppSettings>) => {
        if (p.tableTimerOn !== undefined) db.settings.tableTimerOn = p.tableTimerOn;
        if (p.tableTimerMins !== undefined)
            db.settings.tableTimerMins = Math.min(600, Math.max(1, Math.round(p.tableTimerMins) || 1));
        return out(db.settings);
    },
    /** Adds (no id) or updates (id) a row of one settings list. */
    saveSetting: async (list: SettingsList, id: string | null, v: Record<string, unknown>) => {
        if (list === "tables") {
            const t = {
                name: String(v.name),
                seats: Math.min(40, Math.max(1, +(v.seats as number) || 1)),
                floor: String(v.floor),
            };
            return id ? tables.update(id, t) : tables.add(t);
        }
        if (list === "floors") return id ? tables.updateFloor(id, String(v.name)) : tables.addFloor(String(v.name));
        const l = rows(list);
        if (id) {
            const r = l.find((x) => x.id === id);
            if (r) Object.assign(r, v);
            return out(r);
        }
        const r = { id: uid(), ...v } as SettingsRow;
        l.push(r);
        return out(r);
    },
    /** Why a row cannot be deleted, or an empty string. */
    deleteBlock: async (list: SettingsList, id: string) => {
        if (list === "categories") {
            const n = db.foods.filter((f) => f.cat === id).length;
            return n ? `${n} foods use this category. Move them to another category first.` : "";
        }
        if (list === "tables") {
            const t = db.tables.find((x) => x.id === id);
            return t && t.status !== "inactive"
                ? `${t.name} has guests right now. Collect payment and mark it clean first.`
                : "";
        }
        if (list === "floors") {
            if (db.floors.length === 1) return "The restaurant needs at least one floor level.";
            const n = db.tables.filter((t) => t.floor === id).length;
            return n ? `${n} tables are on this floor. Move or delete them first.` : "";
        }
        if (list === "payments") {
            const n = db.orders.filter((o) => o.payment === id || o.payments?.some((p) => p.method === id)).length;
            const asking = db.tables.filter((t) => t.bill?.method === id).length;
            return n || asking
                ? 'This payment method is already used in orders and cannot be deleted. Turn off "Guests can choose this" instead.'
                : "";
        }
        if (list === "roles") {
            if (db.roles.find((r) => r.id === id)?.admin) return "The Admin role cannot be deleted.";
            const n = db.users.filter((u) => u.role === id).length;
            return n ? `${n} users have this role. Give them another role first.` : "";
        }
        return "";
    },
    deleteSetting: async (list: SettingsList, id: string) => {
        const block = await admin.deleteBlock(list, id);
        if (block) fail(block);
        if (list === "tables") return tables.remove(id);
        if (list === "floors") return tables.removeFloor(id);
        (db as unknown as Record<string, unknown>)[list] = rows(list).filter((r) => r.id !== id);
    },
    /** Counts of foods per category, shown in the Categories tab. */
    foodCounts: async () => {
        const m: Record<string, number> = {};
        db.foods.forEach((f) => {
            m[f.cat] = (m[f.cat] || 0) + 1;
        });
        return m;
    },
};
