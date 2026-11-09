# Backend contract

Laravel mapping (tables, routes, realtime): `docs/LARAVEL.md`. Team conventions: `docs/reusable-components-in-all-projects.md`.

The UI calls these methods (`resources/js/api-service/<domain>/`). Types are in `resources/js/types/restaurant.ts`. Every method is async; failures throw `ApiError(message)` and the UI shows the message in a toast.
Times are epoch milliseconds, money is a number in pesos (2 decimals), ids are strings.

| Module | Methods |
|---|---|
| `catalog` | `foods()`, `categories()`, `createFood(input)`, `updateFood(id, input)`, `deleteFood(id)`, `setFoodStatus(id, status)` |
| `orders` | `list()`, `payTable(tableId, discountId, pays)`, `payBill(orderId, discountId, pays)`, `payPickup(orderId, discountId, pays)`, `handover(orderId)`, `placeTakeout(items, customer, phone, channel, ref)` |
| `kitchen` | `queue()`, `next(id)` queued, cooking, plating, completed; `toReady(id)` takeout; `serve(id)` dine-in |
| `tables` | `list()`, `floors()`, `activate(id, guests)`, `order(id, items, by)` (staff take the order for guests without a phone: `POST /api/tables/{id}/order` with `items: [{ foodId, variantId, qty, note }]`; names and prices come from the menu, and it becomes the next round of the table's order), `clean(id)`, `move(id, x, y)`, `add`, `update`, `remove`, `addFloor`, `updateFloor`, `removeFloor` |
| `reservations` | `list()`, `create`, `update`, `move`, `moveToDay`, `cancel`, `noShow`, `restore`, `dismiss`, `remove`, `seat(id, tableId)` |
| `admin` | `payments()`, `discounts()`, `roles()`, `users()`, `settings()`, `saveSettings`, `saveSetting(list, id, values)`, `deleteSetting(list, id)`, `deleteBlock(list, id)`, `saveProfile(id, { name, email, phone, address, avatar })` (`POST /api/users/{id}/profile`; empty fields clear; a replaced photo is deleted), `changePassword(id, current, next, confirm)` (`POST /api/users/{id}/password`; at least 8 characters; once a password exists the current one is required; stored hashed, never returned: the API only says `hasPassword`) |
| `uploads` | `image(file, folder)`: `POST /api/uploads` (multipart `file`, `folder` = `foods` or `payments`; PNG, JPG, WEBP or GIF up to 4 MB) returns `{ path, url }`. Files are private on the `s3` disk (DigitalOcean Spaces) under `AWS_BUCKET_FOLDER/<folder>`; the record stores the path, the API shows a link that lasts 60 minutes (reused for 50 so polling does not reload pictures), and a link sent back on save is turned into its path again. Replaced or removed pictures are deleted from storage |
| `guest` | `join(tableId, token)`, `plate(tableId)`, `addLine`, `changeQty`, `setNote(tableId, lineId, note)`, `send(tableId, by)`, `billOut(tableId, method)`, `placeTakeout(name, phone)` |

## Rules the server must enforce

- **One order per table session**: the first send creates the order (`code`, e.g. `ORD-1001`); every later send, from any guest on that QR, adds a **round** to it (`ORD-1001-2`, ...). Status belongs to the round (the kitchen cooks rounds), payment belongs to the order. The HTTP API returns one `Order` per round (`id` = round code, plus `code`, `round`, `rounds`); rounds of one session share `session`, so the UI keeps showing one bill. The mock still makes one order per send.
- **QR sessions**: `activate` creates a new token for the table; the guest link is `#t=<table>&k=<token>`. `clean` clears the token, so the old QR stops working. Orders carry the session token.
- **Table status** follows its orders: `active` (no orders), `ordering` (any order queued, cooking, plating or completed), `eating` (all served). `billout` and `cleaning` are set by actions (`billOut`, payment).
- **One bill per table session**: all unpaid orders of a session are paid together (`payTable` / `payBill`), with one discount and a payment list (the payments list supports a split bill, which the UI does not offer for now; the payments must add up to the total after the discount, and each order gets its share).
- **Payable when**: every round of a dine-in order is served; a paid table goes to `cleaning`, and a table that is `billout` or `cleaning` refuses new sends. The server rejects a payment that does not add up to the amount due.
- **Digital payment (GCash, Maya, card), manual verification**: a payment method with `needsRef` shows an optional reference no. field. The guest pays from the QR printed on the bill (`PaymentMethod.qr`, uploaded in Settings) and shows the reference to the waiter. Staff can enter it (`Payment.ref`) when confirming; a payment without one is accepted. When given, it is stored with the payment (`Order.payRef`) and printed on the receipt. Nothing moves money automatically; the amount can still change when staff apply a discount.
- **Amount received**: a single payment can carry `received` (cash handed over). It must be at least the amount due; the server stores `received` and `change` (received minus the due of the whole bill) on every order paid together.
- **Takeout** (`type: 'takeout'`): pickup number `TO-001` per day, channels walk-in, GrabFood, Foodpanda (platform orders are paid in the app and handed to the rider). Status flow queued, cooking, plating, completed, ready, paid.
- **Kitchen notes**: a plate line can carry a note (max 120 characters, e.g. "Less spicy, no onion"). Lines with different notes stay separate order items, and the note is shown on the kitchen card and order details.
- **Reservations**: statuses `booked`, `arrived`, `cancelled`, `noshow`; every change adds a history line. The advance order keeps only food, variant and quantity from the client (names and prices come from the menu). `seat(id, tableId)` needs a booked reservation and an inactive table: it opens the table session with the party size, copies the advance order to the plate, marks the reservation `arrived` and returns the reservation and the table. `moveToDay` keeps the time of day.
- **Roles and users**: a role has a name (unique) and the modules it can open; users have a unique username, a role and an active flag (email is optional, there is no password until login exists). Users and roles are listed in full by `roles()` / `users()`; the UI applies the role's modules, the server does not yet.
- **Foods with variants**: `price` is the lowest variant price; variant names are unique per food.
- **Guards**: a category used by foods and a role used by users cannot be deleted; a table with guests cannot be deleted; the last floor cannot be deleted; reservations cannot double-book a table within 90 minutes or exceed its seats; the Admin role cannot be deleted; the last active Admin user cannot be deleted, deactivated or moved to another role (so nobody is locked out of Settings).

## Realtime

Guests on different phones share one plate, and staff need new orders and bill requests immediately. The mock has no push, so screens refetch on navigation (React Query
`staleTime: 0`). Add WebSocket/SSE (for example Laravel Reverb) and call `queryClient.invalidateQueries` on events, or set `refetchInterval` on the hooks in `resources/js/hooks/useApi.ts`.
Bell notifications (`useUi().notify`) are currently produced by the client after its own actions; the server should emit them as events instead.

## Not covered yet

Authentication on the backend (staff routes answer 403 outside `local`/`testing` until Sanctum login and role policies exist; the login page is still a mock), server-side role enforcement (the UI hides modules, the API does not check yet), file uploads for food photos (stored as URLs or data URLs), a per-device plate for the Takeout QR (one shared plate today), realtime, receipts, reports, daily history seed data.
