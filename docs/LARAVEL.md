# Laravel backend plan

Follows `docs/reusable-components-in-all-projects.md` (the team's boilerplate report): Laravel 13, Octane on FrankenPHP, PostgreSQL + Redis in production, literal `app_` table names, the `BaseController` + `Route::crudModule` CRUD pattern and the `{ success, message, data }` envelope.
Section numbers below refer to that document.

## How the frontend connects

`resources/js/api-service/` is the section 5 data layer: `client.ts` (axios, CSRF, `ApiError`, `unwrap`), `http.ts` (`createCrudResource`), `form-data.ts`, and `types/reusable/pagination.ts`.
Set `VITE_API_URL` (see `.env.example`) and `resources/js/api-service/index.ts` switches modules from the in-memory mock to HTTP. Done in the Laravel app at the repo root: foods, categories, orders, kitchen, tables, floors, guest ordering, payment methods and discounts
(`<domain>/http.ts` for catalog, orders, kitchen, tables, guest, admin). Every module has an HTTP twin now. The compiler checks each HTTP module against its mock (`pick` in `resources/js/api-service/index.ts`).
Run it with the README.

## Tables (section 11: literal `app_` names, explicit `$table`, full names in `exists:` / `unique:`)

Framework and Spatie tables stay unprefixed (`users`, `roles`, `permissions`, ...). Statuses are strings (`string(20)`), money is `decimal(10,2)`, times are `timestampTz` (the API returns epoch milliseconds, convert in the Resource).

| Table | Columns | Notes |
|---|---|---|
| `app_categories` | id, name (unique), description, status | |
| `app_foods` | id, category_id FK `app_categories`, name, price, description, status (`available`/`unavailable`), eta_minutes, tags json | `price` = lowest variant price when variants exist |
| `app_food_variants` | id, food_id FK, name, price; unique (food_id, name) | |
| `app_food_photos` | id, food_id FK, path, position | the mock stores data URLs; the backend stores files (use `HandlesFileUploads`, `$fileFields`) |
| `app_payment_methods` | id, name, details, active, needs_ref, qr (image data URL or URL; move to stored files with `HandlesFileUploads` later) | `needs_ref`: GCash, Maya, cards; staff must enter the transaction reference |
| `app_discounts` | id, name, pct, note, active | |
| `app_floors` | id, name | at least one must exist |
| `app_dining_tables` | id, floor_id FK, name, seats, x, y (percent), status | `status` follows the open session (see rules) |
| `app_table_sessions` | id, table_id FK, token (unique), guests, opened_at, closed_at null, bill_method null, bill_requested_at null | replaces `token`/`openedAt`/`bill` on the table; a new row per activation, closing it invalidates the QR |
| `app_orders` | id, code (`ORD-1001`), session_id FK null (unique: **one order per table session**), table_id FK null, type (`dine_in`/`takeout`), created_by, discount_name null, discount_pct null, payment_method null, received null, change_given null, paid_at null | takeout: pickup_code (`TO-001`, per day), customer, phone, source (`counter`/`qr`), channel (`walkin`/`grab`/`panda`), channel_ref |
| `app_order_rounds` | id, order_id FK, round_no, code (unique: `ORD-1001`, `ORD-1001-2`), status (`queued`...`served`/`ready`), created_by, eta_minutes, ready_at, served_at | every "Send to kitchen" adds a round; the kitchen works on rounds |
| `app_order_items` | id, round_id FK, food_id FK null, variant_id null, name, price, qty, note (string 120, null) | name and price are snapshots |
| `app_order_payments` | id, order_id FK, method, amount, reference null | several rows = split bill; each round's share is computed (`Settlement::shares`) |
| `app_plate_lines` | id, session_id FK (or `takeout_token`), food_id FK, variant_id null, qty, added_by, note (string 120, null) | the shared plate before it is sent |
| `app_reservations` | id, name, phone, pax, starts_at, table_id FK null, note, status (`booked`/`arrived`/`cancelled`/`noshow`), cancel_reason null, dismissed bool | one live booking per table within 90 minutes; seats must fit |
| `app_roles` | id, name (unique), modules json (module ids of the UI), is_admin bool | the built-in Admin role keeps every module and cannot be deleted |
| `app_reservation_items` | id, reservation_id FK, food_id, variant_id null, name, price, qty | advance order, copied to the plate when seated |
| `app_reservation_history` | id, reservation_id FK, at, text | |
| `app_settings` | id, table_timer_on bool, table_timer_mins (1 to 600) | one row, created on first read (`AppSetting::current()`) |

Users: the framework `users` table gained `username` (unique), `role_id` FK `app_roles` (restrict on delete), `active`; `email` and `password` are optional until login exists. When Sanctum login arrives, the role's `modules` become the policy/route-middleware check (the UI only hides modules today).
Every table gets an explicit `$table`, short explicit index names for long composite keys (section 11.4), and foreign keys with `->constrained('app_...')`.

## Routes: standard CRUD plus actions

Register custom `POST` routes before `Route::crudModule` (section 6.1). `crudModule` gives index, `pagination-search`, `search-active`, `lookup`, `in-use`, store, `POST /{id}` update, archive, restore, destroy.

| Frontend method | Endpoint |
|---|---|
| `catalog.foods/createFood/updateFood/deleteFood`, `categories` | `crudModule('/foods')`, `crudModule('/categories')` (guards through `$inUseRelations`: foods use a category) |
| `orders.list` | `GET /orders?range=today\|week\|month&q=` (one entry per round, see BACKEND.md) |
| `orders.payTable / payBill / payPickup / handover` | `POST /tables/{id}/pay`, `POST /orders/{code}/pay` (pays the whole order), `POST /orders/{code}/pickup`, `POST /orders/{code}/handover` |
| `orders.placeTakeout`, `guest.placeTakeout` | `POST /takeout` (staff) and `POST /public/takeout` (QR) |
| `kitchen.queue / next / toReady / serve` | `GET /kitchen/queue`, `PATCH /orders/{code}/advance`, `PATCH /orders/{code}/ready`, `PATCH /orders/{code}/serve` (`{code}` is the round code) |
| `tables.*` | `crudModule('/tables')`, `crudModule('/floors')`, `POST /tables/{id}/activate`, `POST /tables/{id}/clean`, `PATCH /tables/{id}/position` |
| `reservations.*` | `crudModule('/reservations', only index, store, update)`, `PATCH /reservations/{id}/move`, `/move-day`, `/cancel`, `/no-show`, `/restore`, `/dismiss`, `POST /reservations/{id}/seat` |
| `admin.*` | `crudModule('/payment-methods')`, `/discounts`, `/roles`, `/users`; `GET/PATCH /settings` (`tableTimerOn`, `tableTimerMins`) |
| `guest.*` | public, token-scoped: `GET /public/tables/{table}/session?k=` (join), `.../plate?k=`, `POST .../plate-lines`, `PATCH .../plate-lines/{id}` (`delta` or `note`), `POST .../send`, `POST .../bill-out`; Takeout QR uses table `__takeout` |

Guest endpoints are unauthenticated: authorize by the table token in the query string and reject a closed or replaced session. Rate-limit them.
Rules (status sync, split-bill settlement, one bill per session, guards) are listed in `docs/BACKEND.md`; implement them in actions/services, not in controllers.

## Realtime

Use Laravel Reverb (or Pusher) with Echo; broadcast `OrderCreated`, `OrderStatusChanged`, `BillRequested`, `PlateChanged`, `ReservationDue` and call `queryClient.invalidateQueries` in `resources/js/AppProviders.tsx` on each event. Octane rules in section 10.5 apply (no per-request state in statics).

## Environment

PHP 8.4 with the extension list in section 12 (`bcmath` for money, `gd`, `pdo_pgsql`, `redis`, ...), pinned images, `/up` health check, one-off migrate service (section 10). Do not copy the items in section 13.
