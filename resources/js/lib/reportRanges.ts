/**
 * Date ranges for reports. Dates are plain YYYY-MM-DD in the browser's days, which the server reads as the restaurant's days.
 * A "this week" or "this month" range is compared with the same days of the period before, so it is fair while the period is
 * still running (it would otherwise always look like a drop against a finished one).
 */

export type Preset = "today" | "yesterday" | "week" | "lastWeek" | "month" | "lastMonth" | "custom";

export interface Range {
    from: string;
    to: string;
    compareFrom?: string;
    compareTo?: string;
}

export const PRESETS: [Preset, string][] = [
    ["today", "Today"],
    ["yesterday", "Yesterday"],
    ["week", "This week"],
    ["lastWeek", "Last week"],
    ["month", "This month"],
    ["lastMonth", "Last month"],
    ["custom", "Custom"],
];

export const ymd = (t: Date) =>
    `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
export const parseYmd = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
};
const addDays = (t: Date, n: number) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + n);
const mondayOf = (t: Date) => addDays(t, -((t.getDay() + 6) % 7));
const monthEnd = (y: number, m: number) => new Date(y, m + 1, 0);

export function presetRange(p: Exclude<Preset, "custom">, now = new Date()): Range {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (p) {
        case "today":
            return {
                from: ymd(today),
                to: ymd(today),
                compareFrom: ymd(addDays(today, -1)),
                compareTo: ymd(addDays(today, -1)),
            };
        case "yesterday": {
            const y = addDays(today, -1);
            return { from: ymd(y), to: ymd(y), compareFrom: ymd(addDays(y, -1)), compareTo: ymd(addDays(y, -1)) };
        }
        case "week": {
            const mon = mondayOf(today);
            return {
                from: ymd(mon),
                to: ymd(addDays(mon, 6)),
                compareFrom: ymd(addDays(mon, -7)),
                compareTo: ymd(addDays(today, -7)), // the same days last week, up to today's weekday
            };
        }
        case "lastWeek": {
            const mon = addDays(mondayOf(today), -7);
            return {
                from: ymd(mon),
                to: ymd(addDays(mon, 6)),
                compareFrom: ymd(addDays(mon, -7)),
                compareTo: ymd(addDays(mon, -1)),
            };
        }
        case "month": {
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            const prevFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const prevSameDay = new Date(
                prevFirst.getFullYear(),
                prevFirst.getMonth(),
                Math.min(today.getDate(), monthEnd(prevFirst.getFullYear(), prevFirst.getMonth()).getDate()),
            );
            return {
                from: ymd(first),
                to: ymd(monthEnd(today.getFullYear(), today.getMonth())),
                compareFrom: ymd(prevFirst),
                compareTo: ymd(prevSameDay),
            };
        }
        case "lastMonth": {
            const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const prevFirst = new Date(first.getFullYear(), first.getMonth() - 1, 1);
            return {
                from: ymd(first),
                to: ymd(monthEnd(first.getFullYear(), first.getMonth())),
                compareFrom: ymd(prevFirst),
                compareTo: ymd(monthEnd(prevFirst.getFullYear(), prevFirst.getMonth())),
            };
        }
    }
}

/** What the comparison is, in words ("vs the same days last week"). */
export const compareLabel = (p: Preset): string =>
    ({
        today: "yesterday",
        yesterday: "the day before",
        week: "the same days last week",
        lastWeek: "the week before",
        month: "the same days last month",
        lastMonth: "the month before",
        custom: "the period right before",
    })[p];

/** Percent change from `prev` to `cur`. `null` when there is nothing to compare with (previous was zero and now is not). */
export const pctChange = (cur: number, prev: number): number | null =>
    prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / prev) * 1000) / 10;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Nov 9" or "Nov 9, 2026". */
export const dayText = (s: string, withYear = false) => {
    const d = parseYmd(s);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}${withYear ? `, ${d.getFullYear()}` : ""}`;
};
/** "Nov 9 – Nov 15, 2026", or "Nov 9, 2026" for one day. */
export const rangeText = (from: string, to: string) =>
    from === to
        ? `${dayText(from, true)}`
        : parseYmd(from).getFullYear() === parseYmd(to).getFullYear()
          ? `${dayText(from)} – ${dayText(to, true)}`
          : `${dayText(from, true)} – ${dayText(to, true)}`;
