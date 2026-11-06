// Request and response shapes shared with the Laravel CRUD backend (see docs/reusable-components-in-all-projects.md, section 5).
export interface ApiEnvelope<T> {
    success?: boolean;
    message?: string;
    data: T;
}

export interface CrudQueryParams {
    search?: string;
    filters?: Record<string, string | number | boolean | null | undefined>;
    sort_by?: string;
    sort_dir?: "asc" | "desc";
    per_page?: number;
    page?: number;
}
export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}
export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
    links: Record<string, string | null>;
    filterable?: string[];
    searchable?: string[];
    filters?: Record<string, unknown>;
    search?: string;
    sort_by?: string;
    sort_dir?: string;
}
export interface LookupOption {
    value: string | number;
    label: string;
}
