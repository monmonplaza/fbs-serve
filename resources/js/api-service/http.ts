/**
 * @file api-service/http.ts
 * Typed CRUD helper factory bound to a resource `baseUrl`; mirrors the `Route::crudModule` surface so each concrete service is a thin binding.
 */

import { http, unwrap } from "@/api-service/client";
import { buildFormData, buildQueryString, hasBinaryFiles } from "@/api-service/form-data";
import type { CrudQueryParams, LookupOption, PaginatedResponse } from "@/types/reusable/pagination";

interface CrudOptions {
    baseUrl: string;
}
interface WriteOptions {
    onUploadProgress?: (percent: number) => void;
}

/**
 * Client for one backend resource registered with `Route::crudModule($prefix, Controller::class, $name)`.
 * The same factory the other projects use, so a Laravel controller built from the CRUD template works with no extra glue.
 */
export function createCrudResource<T, TInput = Partial<T>>({ baseUrl }: CrudOptions) {
    const write = async (url: string, data: TInput, opts?: WriteOptions) => {
        const body = hasBinaryFiles(data) ? buildFormData(data as Record<string, unknown>) : data;
        const r = await http.post(url, body, {
            onUploadProgress: (e) => {
                if (opts?.onUploadProgress && e.total) opts.onUploadProgress(Math.round((e.loaded / e.total) * 100));
            },
        });
        return unwrap<T>(r);
    };
    return {
        getAll: async (params?: CrudQueryParams) =>
            unwrap<T[]>(await http.get(baseUrl + buildQueryString(params as Record<string, unknown>))),
        getPaginatedFilterSearch: async (params?: CrudQueryParams) =>
            (
                await http.get<PaginatedResponse<T>>(
                    `${baseUrl}/pagination-search${buildQueryString(params as Record<string, unknown>)}`,
                )
            ).data,
        searchActive: async (params?: CrudQueryParams) =>
            unwrap<T[]>(
                await http.get(`${baseUrl}/search-active${buildQueryString(params as Record<string, unknown>)}`),
            ),
        lookup: async (q = "", params?: CrudQueryParams) =>
            unwrap<LookupOption[]>(
                await http.get(`${baseUrl}/lookup${buildQueryString({ status: "active", q, ...params })}`),
            ),
        inUse: async (id: string | number) =>
            unwrap<{ label: string; count: number }[]>(await http.get(`${baseUrl}/${id}/in-use`)),
        create: (data: TInput, opts?: WriteOptions) => write(baseUrl, data, opts),
        /** A real POST (no `_method` spoofing) so file uploads work. */
        update: (id: string | number, data: TInput, opts?: WriteOptions) => write(`${baseUrl}/${id}`, data, opts),
        archive: async (id: string | number) => unwrap<T>(await http.patch(`${baseUrl}/${id}/archive`)),
        restore: async (id: string | number) => unwrap<T>(await http.patch(`${baseUrl}/${id}/restore`)),
        delete: async (id: string | number) => {
            await http.delete(`${baseUrl}/${id}`);
        },
    };
}
