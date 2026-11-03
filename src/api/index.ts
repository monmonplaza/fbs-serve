import { catalog } from './catalog';
import { orders } from './orders';
import { tables } from './tables';
import { reservations } from './reservations';
import { admin } from './admin';
import { guest } from './guest';

/**
 * The one place the UI talks to the backend. Every method is async and returns plain data.
 * Today each module is an in-memory mock (see ./db.ts); swap a module for fetch calls to move to a real API
 * without touching the screens.
 */
export const api = { catalog, orders, tables, reservations, admin, guest };
export { ApiError } from './core';
