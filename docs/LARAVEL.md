# Laravel backend plan

Follows `docs/reusable-components-in-all-projects.md` (the team's boilerplate report): Laravel 13, Octane on FrankenPHP, PostgreSQL + Redis in production, literal `app_` table names, the `BaseController` + `Route::crudModule` CRUD pattern and the `{ success, message, data }` envelope.
Section numbers below refer to that document.

## How the frontend connects

`src/api/http/` is the section 5 data layer: `client.ts` (axios, CSRF, `ApiError`, `unwrap`), `crud.ts` (`createCrudResource`), `formData.ts`, `types.ts`.
Set `VITE_API_URL` (see `.env.example`) and `src/api/index.ts` switches modules from the in-memory mock to HTTP. Foods and categories are done (`catalog.http.ts`);
move the other modules one at a time (`orders`, `tables`, ...), keeping the same method names and return shapes as the mock, so no screen changes.

## Tables (section 11: literal `app_` names, explicit `$table`, full names in `exists:` / `unique:`)

Framework and Spatie tables stay unprefixed (`users`, `roles`, `permissions`, ...). Statuses are strings (`string(20)`), money is `decimal(10,2)`, times are `timestampTz` (the API returns epoch milliseconds, convert in the Resource).

| Table | Columns | Notes |
|---|---|---|
| `app_categories` | id, name (unique), description, status | |
| `app_foods` | id, category_id FK `app_categories`, name, price, description, status (`available`/`unavailable`), eta_minutes, tags json | `price` = lowest variant price when variants exist |
| `app_food_variants` | id, food_id FK, name, price; unique (food_id, name) | |
| `app_food_photos` | id, food_id FK, path, position | the mock stores data URLs; the backend stores files (use `HandlesFileUploads`, `$fileFields`) |
| `app_payment_methods` | id, name, details, active | |
| `app_discounts` | id, name, pct, note, active | |
| `app_floors` | id, name | at least one must exist |
| `app_dining_tables` | id, floor_id FK, name, seats, x, y (percent), status | `status` follows the open session (see rules) |
| `app_table_sessions` | id, table_id FK, token (unique), guests, opened_at, closed_at null, bill_method null, bill_requested_at null | replaces `token`/`openedAt`/`bill` on the table; a new row per activation, closing it invalidates the QR |
| `app_orders` | id, code (`ORD-1001`), session_id FK null, table_id FK null, type (`dine_in`/`takeout`), status, created_by (guest name or customer), eta_minutes, discount_name null, discount_pct null, paid_at null, served_at null, ready_at null | takeout: pickup_code (`TO-001`, per day), customer, phone, source (`counter`/`qr`), channel (`walkin`/`grab`/`panda`), channel_ref |
| `app_order_items` | id, order_id FK, food_id FK, variant_id FK null, name, price, qty, note (string 120, null) | name and price are snapshots |
| `app_order_payments` | id, order_id FK, method, amount | several rows = split bill |
| `app_plate_lines` | id, session_id FK (or `takeout_token`), food_id FK, variant_id null, qty, added_by, note (string 120, null) | the shared plate before it is sent |
| `app_reservations` | id, name, phone, pax, starts_at, table_id FK null, note, status, cancel_reason null, dismissed bool | |
| `app_reservation_items` | id, reservation_id FK, food_id, variant_id null, name, price, qty | advance order, copied to the plate when seated |
| `app_reservation_history` | id, reservation_id FK, at, text | |
| `app_settings` | key (unique), value json | `table_timer_on`, `table_timer_mins` |

Users and roles: use `users` plus Spatie `roles`; the module list a role can open (`Role.modules`) becomes Spatie permissions (`module.orders`, ...) checked by the policies and by `role:` route middleware.
Every table gets an explicit `$table`, short explicit index names for long composite keys (section 11.4), and foreign keys with `->constrained('app_...')`.

## Routes: standard CRUD plus actions

Register custom `POST` routes before `Route::crudModule` (section 6.1). `crudModule` gives index, `pagination-search`, `search-active`, `lookup`, `in-use`, store, `POST /{id}` update, archive, restore, destroy.

| Frontend method | Endpoint |
|---|---|
| `catalog.foods/createFood/updateFood/deleteFood`, `categories` | `crudModule('/foods')`, `crudModule('/categories')` (guards through `$inUseRelations`: foods use a category) |
| `orders.list` | `GET /orders?range=today\|week\|month&q=` |
| `orders.payTable / payBill / payPickup / handover` | `POST /sessions/{id}/pay`, `POST /orders/{id}/pay` (pays the whole bill), `POST /orders/{id}/pickup`, `POST /orders/{id}/handover` |
| `orders.placeTakeout`, `guest.placeTakeout` | `POST /takeout` (staff) and `POST /public/takeout` (QR) |
| `kitchen.next / toReady / serve` | `PATCH /orders/{id}/advance`, `PATCH /orders/{id}/ready`, `PATCH /orders/{id}/serve` |
| `tables.*` | `crudModule('/tables')`, `crudModule('/floors')`, `POST /tables/{id}/activate`, `POST /tables/{id}/clean`, `PATCH /tables/{id}/position` |
| `reservations.*` | `crudModule('/reservations')`, `PATCH /reservations/{id}/move`, `/cancel`, `/no-show`, `/restore`, `/dismiss`, `POST /reservations/{id}/seat` |
| `admin.*` | `crudModule('/settings/payments')`, `/discounts`, `/roles`, `/users`; `GET/PUT /settings` |
| `guest.*` | public, token-scoped: `GET /public/tables/{table}/plate?k=`, `POST .../plate-lines`, `PATCH .../plate-lines/{id}` (qty or note), `POST .../send`, `POST .../bill-out` |

Guest endpoints are unauthenticated: authorize by the table token in the query string and reject a closed or replaced session. Rate-limit them.
Rules (status sync, split-bill settlement, one bill per session, guards) are listed in `docs/BACKEND.md`; implement them in actions/services, not in controllers.

## Realtime

Use Laravel Reverb (or Pusher) with Echo; broadcast `OrderCreated`, `OrderStatusChanged`, `BillRequested`, `PlateChanged`, `ReservationDue` and call `queryClient.invalidateQueries` in `src/app` on each event. Octane rules in section 10.5 apply (no per-request state in statics).

## Environment

PHP 8.4 with the extension list in section 12 (`bcmath` for money, `gd`, `pdo_pgsql`, `redis`, ...), pinned images, `/up` health check, one-off migrate service (section 10). Do not copy the items in section 13.
