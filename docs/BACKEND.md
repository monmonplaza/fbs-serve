# Backend contract

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
| `guest` | `join(tableId, token)`, `plate(tableId)`, `addLine`, `changeQty`, `send(tableId, by)`, `billOut(tableId, method)`, `placeTakeout(name, phone)` |

## Rules the server must enforce

- **QR sessions**: `activate` creates a new token for the table; the guest link is `#t=<table>&k=<token>`. `clean` clears the token, so the old QR stops working. Orders carry the session token.
- **Table status** follows its orders: `active` (no orders), `ordering` (any order queued, cooking, plating or completed), `eating` (all served). `billout` and `cleaning` are set by actions (`billOut`, payment).
- **One bill per table session**: all unpaid orders of a session are paid together (`payTable` / `payBill`), with one discount and a payment list (split bill; the payments must add up to the total after the discount, and each order gets its share).
- **Takeout** (`type: 'takeout'`): pickup number `TO-001` per day, channels walk-in, GrabFood, Foodpanda (platform orders are paid in the app and handed to the rider). Status flow queued, cooking, plating, completed, ready, paid.
- **Foods with variants**: `price` is the lowest variant price; variant names are unique per food.
- **Guards**: a category used by foods and a role used by users cannot be deleted; a table with guests cannot be deleted; the last floor cannot be deleted; reservations cannot double-book a table within 90 minutes or exceed its seats.

## Realtime

Guests on different phones share one plate, and staff need new orders and bill requests immediately. The mock has no push, so screens refetch on navigation (React Query
`staleTime: 0`). Add WebSocket/SSE (for example Laravel Reverb) and call `queryClient.invalidateQueries` on events, or set `refetchInterval` on the hooks in `src/api/queries.ts`.
Bell notifications (`useUi().notify`) are currently produced by the client after its own actions; the server should emit them as events instead.

## Not covered yet

Authentication (the signed-in user is `u1`), per-role module access (roles exist but are not enforced), receipts, reports, daily reset of pickup numbers.
