import { catalog as catalogMock } from './catalog';
import { catalogHttp } from './catalog.http';
import { USE_HTTP } from './http/client';
import { orders as ordersMock } from './orders';
import { ordersHttp } from './orders.http';
import { kitchen as kitchenMock } from './kitchen';
import { kitchenHttp } from './kitchen.http';
import { tables as tablesMock } from './tables';
import { tablesHttp } from './tables.http';
import { reservations } from './reservations';
import { admin as adminMock } from './admin';
import { adminHttp } from './admin.http';
import { guest as guestMock } from './guest';
import { guestHttp } from './guest.http';

/**
 * The one place the UI talks to the backend. Every method is async and returns plain data.
 * Today each module is an in-memory mock (see ./db.ts); swap a module for fetch calls to move to a real API
 * without touching the screens.
 */
/**
 * With VITE_API_URL set, foods, categories, orders, kitchen, tables, floors, guest ordering and the payment/discount settings talk to the
 * Laravel backend (backend/). Reservations, roles, users and the table timer still use the mock until their endpoints exist.
 */
// `H extends T` makes the compiler check that an HTTP module has the same methods and return shapes as its mock.
const pick = <T, H extends T>(mock: T, http: H): T => (USE_HTTP ? http : mock);
const catalog = pick(catalogMock, catalogHttp as unknown as typeof catalogMock);
const orders = pick(ordersMock, ordersHttp);
const kitchen = pick(kitchenMock, kitchenHttp);
const tables = pick(tablesMock, tablesHttp);
const admin = pick(adminMock, adminHttp as unknown as typeof adminMock);
const guest = pick(guestMock, guestHttp);
export const api = { catalog, orders, kitchen, tables, reservations, admin, guest };
export { ApiError } from './core';
