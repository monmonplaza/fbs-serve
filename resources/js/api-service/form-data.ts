/**
 * @file api-service/form-data.ts
 * Serializes request payloads: FormData for file-bearing bodies, and query strings for list filters.
 */

/** True when the payload holds a File or Blob, so it has to be sent as multipart FormData. */
export function hasBinaryFiles(v: unknown): boolean {
    if (v instanceof File || v instanceof Blob) return true;
    if (Array.isArray(v)) return v.some(hasBinaryFiles);
    if (v && typeof v === "object") return Object.values(v).some(hasBinaryFiles);
    return false;
}

/** Laravel-style bracketed keys: `items[0][name]`. Booleans become 1/0, null and undefined are skipped. */
export function buildFormData(data: Record<string, unknown>, form = new FormData(), prefix = ""): FormData {
    Object.entries(data).forEach(([k, v]) => {
        const key = prefix ? `${prefix}[${k}]` : k;
        if (v == null) return;
        if (v instanceof File || v instanceof Blob) form.append(key, v);
        else if (Array.isArray(v))
            v.forEach((x, i) =>
                x && typeof x === "object" && !(x instanceof Blob)
                    ? buildFormData(x as Record<string, unknown>, form, `${key}[${i}]`)
                    : form.append(`${key}[${i}]`, x instanceof Blob ? x : String(x)),
            );
        else if (typeof v === "object") buildFormData(v as Record<string, unknown>, form, key);
        else form.append(key, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
    });
    return form;
}

/** Query string with bracketed filters: `filters[status]=active&page=2`. */
export function buildQueryString(params: Record<string, unknown> = {}): string {
    const q = new URLSearchParams();
    const add = (key: string, v: unknown) => {
        if (v == null || v === "") return;
        if (typeof v === "object" && !Array.isArray(v)) Object.entries(v).forEach(([k, x]) => add(`${key}[${k}]`, x));
        else if (Array.isArray(v)) v.forEach((x, i) => add(`${key}[${i}]`, x));
        else q.append(key, String(v));
    };
    Object.entries(params).forEach(([k, v]) => add(k, v));
    const s = q.toString();
    return s ? "?" + s : "";
}
