# Backend contract

Laravel mapping (tables, routes, realtime): `docs/LARAVEL.md`. Team conventions: `docs/reusable-components-in-all-projects.md`.

The UI calls these methods (`src/api/*.ts`). Types are in `src/api/types.ts`. Every method is async; failures throw `ApiError(message)` and the UI shows the message in a toast.
Times are epoch milliseconds, money is a number in pesos (2 decimals), ids are strings.

| Module | Methods |
|---|---|
| `catalog` | `foods()`, `categories()`, `createFood(input)`, `updateFood(id, input)`, `deleteFood(id)`, `setFoodStatus(id, status)` |
| `orders` | `list()`, `payTable(tableId, discountId, pays)`, `payBill(orderId, discountId, pays)`, `payPickup(orderId, discountId, pays)`, `handover(orderId)`, `placeTakeout(items, customer, phone, channel, ref)` |
| `kitchen` | `queue()`, `next(id)` queued, cooking, plating, completed; `toReady(id)` takeout; `serve(id)` dine-in |
| `tables` | `list()`, `floors()`, `activate(id, guests)`, `clean(id)`, `move(id, x, y)`, `add`, `update`, `remove`, `addFloor`, `updateFloor`, `removeFloor` |
| `reservations` | `list()`, `create`, `update`, `move`, `moveToDay`, `cancel`, `noShow`, `restore`, `dismiss`, `seat(id, tableId)` |
| `admin` | `payments()`, `discounts()`, `roles()`, `users()`, `settings()`, `saveSettings`, `saveSetting(list, id, values)`, `deleteSetting(list, id)`, `deleteBlock(list, id)`, `updateProfile` |
| `guest` | `join(tableId, token)`, `plate(tableId)`, `addLine`, `changeQty`, `setNote(tableId, lineId, note)`, `send(tableId, by)`, `billOut(tableId, method)`, `placeTakeout(name, phone)` |

## Rules the server must enforce

- **One order per table session**: the first send creates the order (`code`, e.g. `ORD-1001`); every later send, from any guest on that QR, adds a **round** to it (`ORD-1001-2`, ...). Status belongs to the round (the kitchen cooks rounds), payment belongs to the order. The HTTP API returns one `Order` per round (`id` = round code, plus `code`, `round`, `rounds`); rounds of one session share `session`, so the UI keeps showing one bill. The mock still makes one order per send.
- **QR sessions**: `activate` creates a new token for the table; the guest link is `#t=<table>&k=<token>`. `clean` clears the token, so the old QR stops working. Orders carry the session token.
- **Table status** follows its orders: `active` (no orders), `ordering` (any order queued, cooking, plating or completed), `eating` (all served). `billout` and `cleaning` are set by actions (`billOut`, payment).
- **One bill per table session**: all unpaid orders of a session are paid together (`payTable` / `payBill`), with one discount and a payment list (the payments list supports a split bill, which the UI does not offer for now; the payments must add up to the total after the discount, and each order gets its share).
- **Payable when**: every round of a dine-in order is served; a paid table goes to `cleaning`, and a table that is `billout` or `cleaning` refuses new sends. The server rejects a payment that does not add up to the amount due.
- **Digital payment (GCash, Maya, card), manual verification**: a payment method with `needsRef` needs a transaction reference. The guest pays from the QR printed on the bill (`PaymentMethod.qr`, uploaded in Settings) and shows the reference to the waiter. Staff must enter it (`Payment.ref`) before confirming: the server rejects a payment for a `needsRef` method without one. It is stored with the payment (`Order.payRef`) and printed on the receipt. Nothing moves money automatically; the amount can still change when staff apply a discount.
- **Amount received**: a single payment can carry `received` (cash handed over). It must be at least the amount due; the server stores `received` and `change` (received minus the due of the whole bill) on every order paid together.
- **Takeout** (`type: 'takeout'`): pickup number `TO-001` per day, channels walk-in, GrabFood, Foodpanda (platform orders are paid in the app and handed to the rider). Status flow queued, cooking, plating, completed, ready, paid.
- **Kitchen notes**: a plate line can carry a note (max 120 characters, e.g. "Less spicy, no onion"). Lines with different notes stay separate order items, and the note is shown on the kitchen card and order details.
- **Foods with variants**: `price` is the lowest variant price; variant names are unique per food.
- **Guards**: a category used by foods and a role used by users cannot be deleted; a table with guests cannot be deleted; the last floor cannot be deleted; reservations cannot double-book a table within 90 minutes or exceed its seats.

## Realtime

Guests on different phones share one plate, and staff need new orders and bill requests immediately. The mock has no push, so screens refetch on navigation (React Query
`staleTime: 0`). Add WebSocket/SSE (for example Laravel Reverb) and call `queryClient.invalidateQueries` on events, or set `refetchInterval` on the hooks in `src/api/queries.ts`.
Bell notifications (`useUi().notify`) are currently produced by the client after its own actions; the server should emit them as events instead.

## Not covered yet

Authentication on the backend (staff routes answer 403 outside `local`/`testing` until Sanctum login and role policies exist; the login page is still a mock), server-side role enforcement (the UI hides modules, the API does not check yet), reservations, roles, users, settings and the table timer on HTTP, file uploads for food photos (stored as URLs or data URLs), a per-device plate for the Takeout QR (one shared plate today), realtime, receipts, reports, daily history seed data.
