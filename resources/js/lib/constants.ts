import type { FoodTag, ModuleId, OrderStatus, TableStatus } from "@/types/restaurant";

export type Tone = "neutral" | "info" | "warn" | "ok" | "accent" | "purple" | "error" | "reserved";
export interface StatusMeta {
    l: string;
    c: Tone;
    i?: string;
}

export const NAV: { id: ModuleId; label: string; ic: string }[] = [
    { id: "dashboard", label: "Dashboard", ic: "dash" },
    { id: "orders", label: "Orders", ic: "receipt" },
    { id: "reservations", label: "Reservations", ic: "calendar" },
    { id: "kitchen", label: "Kitchen", ic: "pot" },
    { id: "foods", label: "Foods", ic: "utensils" },
    { id: "tables", label: "Tables", ic: "table" },
    { id: "settings", label: "Settings", ic: "sliders" },
    { id: "guide", label: "Guide", ic: "book" },
];

export const TSTAT: Record<TableStatus, StatusMeta> = {
    inactive: { l: "Inactive", c: "neutral", i: "moon" },
    active: { l: "Active", c: "info", i: "qr" },
    ordering: { l: "Ordering", c: "warn", i: "pot" },
    eating: { l: "Eating", c: "ok", i: "utensils" },
    billout: { l: "Bill out", c: "accent", i: "bell" },
    cleaning: { l: "Cleaning", c: "purple", i: "sparkle" },
};

/** Statuses the kitchen is still working on. */
export const KITCHEN: OrderStatus[] = ["queued", "cooking", "plating", "completed"];

export interface OrderStatusMeta extends StatusMeta {
    g: string;
    d: string;
    next?: string;
}
export const OSTAT: Partial<Record<OrderStatus, OrderStatusMeta>> = {
    queued: {
        l: "Queued",
        c: "info",
        g: "Order received",
        d: "Your order is in the kitchen queue.",
        next: "Start cooking",
    },
    cooking: {
        l: "Cooking",
        c: "warn",
        g: "Cooking your food",
        d: "Your food is on the stove.",
        next: "Start plating",
    },
    plating: { l: "Plating", c: "accent", g: "Plating your food", d: "Your dish is being plated.", next: "Order out" },
    completed: {
        l: "Order out",
        c: "ok",
        g: "Your order is out",
        d: "A waiter is bringing it to your table.",
        next: "Mark as served",
    },
    served: { l: "Served", c: "purple", g: "Served. Enjoy your meal!", d: "Tap Bill when you are ready to pay." },
    paid: { l: "Paid", c: "neutral", g: "Paid", d: "Thank you for dining with us." },
};
export const GSTEPS: OrderStatus[] = ["queued", "cooking", "plating", "completed", "served"];
export const GSTEP_L = ["Order received", "Cooking", "Plating", "Order out", "Served"];

/**
 * Takeout has no table. It goes through the kitchen like dine-in; from Order out the kitchen sends it to the counter (Ready for pickup),
 * and the counter marks it Paid (Picked up) in Orders when the customer pays and takes it.
 */
export const TO = "__takeout";
export const TO_OSTAT: Partial<Record<OrderStatus, OrderStatusMeta>> = {
    completed: { l: "Order out", c: "ok", g: "Packing your order", d: "Your food is cooked. We are packing it to go." },
    ready: {
        l: "Ready for pickup",
        c: "ok",
        g: "Ready for pickup",
        d: "Show your pickup number at the counter and pay there.",
    },
    paid: {
        l: "Picked up",
        c: "neutral",
        g: "Picked up. Enjoy your meal!",
        d: "Thank you for ordering from FBS Serve.",
    },
};
export const TO_STEPS: OrderStatus[] = ["queued", "cooking", "plating", "completed", "ready", "paid"];
export const TO_STEP_L = ["Order received", "Cooking", "Plating", "Packing", "Ready for pickup", "Picked up"];
export const TAGS: Record<FoodTag, string> = { new: "New", must: "Must try", best: "Best seller" };
