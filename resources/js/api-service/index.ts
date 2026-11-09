/**
 * @file api-service/index.ts
 * The one place the UI talks to the backend. Each module is the in-memory mock, or its HTTP twin when VITE_API_URL is set.
 */

import { catalog as catalogMock } from "@/api-service/catalog/mock";
import { catalogHttp } from "@/api-service/catalog/http";
import { USE_HTTP } from "@/api-service/client";
import { orders as ordersMock } from "@/api-service/orders/mock";
import { ordersHttp } from "@/api-service/orders/http";
import { kitchen as kitchenMock } from "@/api-service/kitchen/mock";
import { kitchenHttp } from "@/api-service/kitchen/http";
import { tables as tablesMock } from "@/api-service/tables/mock";
import { tablesHttp } from "@/api-service/tables/http";
import { reservations as reservationsMock } from "@/api-service/reservations/mock";
import { reservationsHttp } from "@/api-service/reservations/http";
import { admin as adminMock } from "@/api-service/admin/mock";
import { adminHttp } from "@/api-service/admin/http";
import { guest as guestMock } from "@/api-service/guest/mock";
import { guestHttp } from "@/api-service/guest/http";

/**
 * The one place the UI talks to the backend. Every method is async and returns plain data.
 * Today each module is an in-memory mock (see ./db.ts); swap a module for fetch calls to move to a real API
 * without touching the screens.
 */
/**
 * With VITE_API_URL set, foods, categories, orders, kitchen, tables, floors, guest ordering and the payment/discount settings talk to the
 * Laravel backend: foods, categories, orders, kitchen, tables, floors, reservations, guest ordering and every settings list (payment methods,
 * discounts, roles, users, the table timer).
 */
// `H extends T` makes the compiler check that an HTTP module has the same methods and return shapes as its mock.
const pick = <T, H extends T>(mock: T, http: H): T => (USE_HTTP ? http : mock);
const catalog = pick(catalogMock, catalogHttp as unknown as typeof catalogMock);
const orders = pick(ordersMock, ordersHttp);
const kitchen = pick(kitchenMock, kitchenHttp);
const tables = pick(tablesMock, tablesHttp);
const reservations = pick(reservationsMock, reservationsHttp);
const admin = pick(adminMock, adminHttp as unknown as typeof adminMock);
const guest = pick(guestMock, guestHttp);
export const api = { catalog, orders, kitchen, tables, reservations, admin, guest };
export { ApiError } from "@/api-service/mock/core";
