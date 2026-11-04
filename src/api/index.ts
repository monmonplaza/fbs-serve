import { catalog as catalogMock } from './catalog';
import { catalogHttp } from './catalog.http';
import { USE_HTTP } from './http/client';
import { orders } from './orders';
import { kitchen } from './kitchen';
import { tables } from './tables';
import { reservations } from './reservations';
import { admin } from './admin';
import { guest } from './guest';

/**
 * The one place the UI talks to the backend. Every method is async and returns plain data.
 * Today each module is an in-memory mock (see ./db.ts); swap a module for fetch calls to move to a real API
 * without touching the screens.
 */
/** Foods and categories already have an HTTP version; the other modules still use the mock until their endpoints exist. */
const catalog: typeof catalogMock = USE_HTTP ? (catalogHttp as unknown as typeof catalogMock) : catalogMock;
export const api = { catalog, orders, kitchen, tables, reservations, admin, guest };
export { ApiError } from './core';
