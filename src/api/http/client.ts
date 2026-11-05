import axios, { AxiosError, type AxiosResponse } from 'axios';
import { ApiError } from '../core';
import type { ApiEnvelope } from './types';

export { ApiError };

/** Base URL of the backend. Empty means same origin (the Laravel app serves the page). Set VITE_API_URL for a separate API host. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? '';
/** True when a backend URL is configured; `src/api/index.ts` then uses the HTTP modules instead of the in-memory mocks. */
export const USE_HTTP = import.meta.env.VITE_API_URL !== undefined;

const cookie = (name: string) => document.cookie.split('; ').find(c => c.startsWith(name + '='))?.split('=').slice(1).join('=');

/** One axios instance for the whole app: JSON, cookies (Sanctum/session) and the Laravel CSRF header. */
export const http = axios.create({ baseURL: API_URL, withCredentials: true });

http.interceptors.request.use(config => {
  config.headers.set('Accept', 'application/json');
  config.headers.set('X-Requested-With', 'XMLHttpRequest');
  const xsrf = cookie('XSRF-TOKEN');
  const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  if (xsrf) config.headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrf));
  else if (meta) config.headers.set('X-CSRF-TOKEN', meta);
  return config;
});

// Every failure becomes an ApiError with the server's message and field errors, so screens only handle one error type.
http.interceptors.response.use(
  r => r,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const body = error.response?.data;
    throw new ApiError(body?.message || error.message, error.response?.status ?? 0, body?.errors);
  },
);

/** Unwraps `{ success, message, data }`. Returns null for 204 or an empty body, and the bare body when there is no `data` key. */
export function unwrap<T>(response: AxiosResponse): T {
  if (response.status === 204 || response.data === '' || response.data == null) return null as T;
  const body = response.data as ApiEnvelope<T> | T;
  return (typeof body === 'object' && body !== null && 'data' in body ? (body as ApiEnvelope<T>).data : body) as T;
}
