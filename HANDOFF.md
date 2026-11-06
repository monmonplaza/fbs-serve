> **Note:** the app is now Laravel + Inertia + React in `resources/js` (see README.md and docs/PORTING.md). `docs/prototype/index.html` is the original single-file version these notes describe; behavior is the same.

# FBS Serve — Handoff

Last updated: 2026-10-26. Read this file first when continuing on a new machine or account.

## What this is

FBS Serve is a restaurant management web app. Guests order from their table by scanning a QR code. The order then moves through the kitchen, the waiter serves it, and the guest pays.

**Current state:** a clickable **UI prototype only**. It has no backend, no database and no login. All data is sample data held in page memory, and it resets on every reload. The owner asked for "UI and simple modals first, no backend yet".

- Repo: https://github.com/monmonplaza/fbs-serve (branch `main`)
- Live preview: a claude.ai Artifact owned by the original account. It is **private**, so a different account cannot open it. Run the app locally instead (see below).

## Run it

Hosted copy: GitHub Pages, https://monmonplaza.github.io/fbs-serve/ (turn it on in the repo under Settings, Pages, Deploy from branch `main`, folder `/ (root)`). A phone needs a public address like this to open a table QR link.

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
npx serve .        # or: python3 -m http.server 8000
```

The page loads Instrument Sans from Google Fonts. Everything else is inline.

## Files

| Path | What |
| --- | --- |
| `index.html` | The whole app: CSS tokens, markup and JS (~1,140 lines) |
| `assets/fbs-serve-logo.png` | Logo, 256 px (green service-bell cloche on dark tile) |
| `assets/qrcode.js` | QR code generator library (MIT, unmodified) |
| `docs/FBS-Serve-Color-System.pdf` | Owner's color system v1.0 (source of all colors) |
| `HANDOFF.md` | This file |

## The order process (as built)

The owner's six steps, plus one rule the owner added later: **step 0, activation, always comes first.**

0. Guests sit at an **inactive** table. The waiter selects it in **Tables** and taps **Activate table**, then enters the number of guests. The table becomes **Active**, and only then is its QR code shown. A guest who scans an inactive table sees "Table N is not active yet. Ask your waiter to activate this table."
1. Every guest at the table scans the **same QR**. They all add items to one shared **plate**. Never call it a "cart"; the owner asked for "plate". **One guest** taps **Send to kitchen**, and a confirm modal explains that only one person sends it. The table becomes **Ordering**.
2. The **Kitchen** kanban shows the oldest order first, in four columns: Queued → Cooking → **Plating** → Order out. The guest's phone shows a Foodpanda-style tracker: Order received, Cooking, **Plating** ("Plating your food", the owner's chosen wording), Order out, Served.
3. Every order also appears in **Orders**. Order status drives table status (see `syncTable`).
4. The waiter brings the food and taps **Mark as served** (in Kitchen or in the table dropdown). When every order is served, the table becomes **Eating**.
5. The guest taps **Bill out** and picks an active payment method. The table becomes **Bill out**: a magenta alert banner appears for staff and the table pulses on the floor plan. The waiter opens **Receive payment**, can apply a discount, and confirms. The orders become **Paid** and the table becomes **Cleaning**.
6. After cleaning, the waiter taps **Mark as clean**. The table becomes **Inactive** and the old QR token is invalidated.

Table statuses: `inactive → active → ordering → eating → billout → cleaning → inactive`.
Order statuses: `queued → cooking → plating → completed (Order out) → served → paid`.

## Reservations

Staff book tables ahead on a calendar. There is no guest self-booking.

- **Screens:** Month (default, with a day agenda on the right), Week, and List (filters, search, pagination). Arrows, Today and a date jump move around. `S.resView`, `S.resDay`.
- **Reservation:** `{id, name, phone, pax, at (timestamp), tableId|null, note, status, order|null, history[], dismissed?, cancelReason?}`. Status is `booked`, `arrived`, `cancelled` or `noshow`. Booking length for table conflicts is `RES_MIN` (90 min). A table must have enough seats and no overlapping booking (`resProblem`).
- **Cancel** keeps the record (reason optional) and can be restored. **Reschedule** is a modal (with live table check) or dragging a booked reservation onto another day (`moveResToDay`). Both write to `history`.
- **Advance order** (optional switch in the form, picker modal with category tabs and variants): items are stored on the reservation and paid at the table as usual. **Seat now** (`seatReservation`) activates the table, puts the items on its plate as lines by `Pre-order`, marks the reservation Arrived and shows the QR. It does not send them to the kitchen; one guest reviews and sends.
- **Reminder:** from 20 minutes before the time until 15 minutes after (`REMIND_BEFORE`, `REMIND_AFTER`), while the reservation is booked and not dismissed, a banner shows on every staff screen with Seat now, Open and Got it, and the Reservations menu item gets a badge (`dueRes`). A 10 second check re-renders when the set changes.
- **Tables:** from 60 minutes before to 30 minutes after a booking (`SHOW_BEFORE`, `SHOW_AFTER`), an inactive table shows **Reserved** with the time, in its own color (`--reserved`, a cyan used nowhere else). A table that is in use shows a small Reserved time badge instead. The table pop-up has Seat (name).
- Sample data is created relative to now in `seedReservations()`, so one reservation is always about 18 minutes away.

## Payment and split bill

Every payment form (a table's Receive payment, a served order's modal in Orders, and takeout Collect payment) has a **Split the bill** option.

- Turn it on, pick the number of payers (2 to 12), and each payer gets an amount and a payment method. The amounts start as equal shares to the cent (the last payer takes the extra cent) and can be edited. **Split equally** resets them. Changing the discount recalculates the shares.
- The payment button stays disabled until the amounts add up exactly to the amount to collect. A line under the rows shows what is still to assign.
- Saved on each order as `payments: [{method, amount}]`, with `payment: 'split'` when there is more than one payer. When a table pays several orders at once, each payer's amount is shared across the orders in proportion to their totals, so every order's `payments` add up to its own total. `payName('split')` reads Split bill, and the order detail lists the breakdown. Code: `splitHtml`, `equalRows`, `collectPayments`, `settleOrders`; state in `S.split` and `S.payDue`.
- Paying a served order from Orders (`FORMS.orderPay`) moves its table to Cleaning once nothing on the table is unpaid.

## Takeout (pay on pickup)

Takeout orders have no table and never change a table's status. They are paid when the customer picks them up.

- **Counter:** in **Orders**, tap **New takeout order**, enter the customer name (phone is optional) and add food. It goes straight to the kitchen.
- **Self-order:** in **Orders**, tap **Takeout QR**. It encodes `<page url>#takeout`, which never expires. Customers order on their phone, enter their name and get a pickup number. The phone shows Menu, Plate and Orders only (no Bill tab), and tracks: Order received, Cooking, Packing, Ready for pickup, Picked up.
- Every takeout order gets a pickup number (`TO-001`, `TO-002`, ...) and a **Takeout** tag in the kitchen and in Orders.
- Takeout status: `queued → cooking → plating → completed (Order out) → ready (Ready for pickup) → paid (Picked up)`. In the kitchen a takeout card moves like dine-in; in Order out the kitchen packs it and taps **Ready for pickup**, and the card leaves the kitchen (the takeout version of Mark as served). The kitchen never takes payment.
- Ready orders appear under **Ready for pickup** at the top of Orders, with a badge on the Orders menu item. Paid and picked up is marked only in Orders: **Collect payment** (in that list or in the order detail) picks the method and discount and marks it paid.
- Orders has an **All / Dine-in / Takeout** filter. The dashboard counts takeout orders and includes unpaid takeout in "still to collect".
- **Channel:** every takeout order has `channel`: `walkin`, `grab` (GrabFood) or `panda` (Foodpanda), shown as a neutral **Takeout · <channel>** tag with a colored dot (`chTag`) in the kitchen, Orders, Ready for pickup and the order detail. Staff pick it in **New takeout order** (Order from, plus an optional platform order number in `ref`). Takeout QR orders are always Walk-in. The Orders column filter for Table or pickup lists the three channels.
- **GrabFood and Foodpanda orders are paid in their apps.** The counter does not collect payment: the button is **Hand to rider** (`handoverModal`), which marks the order Picked up with `payment: 'grab'` or `'panda'` (shown as "GrabFood (paid in app)"). Walk-in still uses Collect payment, with split bill.
- Foods with variants work in takeout too: on the phone the guest picks one in a modal; in the counter modal each variant is its own card (draft keys are `foodId|variantId`).
- Code: `order.type === 'takeout'` with `pickup`, `customer`, `phone` and `source` (`counter` or `qr`), `table: null`. Helpers `isTO`, `oMeta` (takeout labels from `TO_OSTAT`), `where`, `newTO`, `toReady`; action `to-ready` moves Order out to Ready for pickup. The takeout plate is `S.plates.__takeout` (`TO`), and the phone's own orders are `S.toMine`. Views: `toPhone`, `toPlate`, `toTrack`; modals: `toCounterModal`, `toQrModal`, `pickupModal`.

## Modules

The top bar switches between **Staff** and **Guest phone**. Guest phone is a phone-frame preview: you can pick any table and act as Guest 1, 2 or 3 to show the shared plate.

- **Dashboard**:
  - Income today, plus the amount still to collect
  - Orders today
  - Active and inactive table counts
  - Top 5 foods ordered today
  - Orders in the kitchen now
  - Table status counts
- **Orders**:
  - Today, This week (from Monday) and This month filters
  - Search by order ID (it searches all dates)
  - Every status is shown
  - Selecting a row opens a detail modal
- **Kitchen**:
  - Five-column kanban, oldest order first
  - Cards over 20 minutes old get a magenta ring and a red time
- **Foods**:
  - Card or table view, filter by category
  - Add and edit in one modal: name, category, price, **prep time in minutes** (shown to guests as the estimated wait), description, **several photos** (FileReader data URLs, memory only; the first is the cover), status (available or not available), tags (New, Must try, Best seller)
  - **Variants** (sizes or portions, such as pizza Small/Medium/Large or a Regular/Large drink): in the food modal, **Add variant** gives each one a name and its own price. `food.variants = [{id, name, price}]`, and `food.price` is kept as the lowest variant price (shown as "From ₱..."; the price field is locked while variants exist). Variant names must be different.
  - Cards show 4 per row on wide screens (3, 2, 1 as it narrows)
  - Card view lazy-loads 8 cards at a time as you scroll (an IntersectionObserver on a spinner row, `watchFoods()`); there is no Load more button unless the browser lacks IntersectionObserver. Table view uses pagination
  - Tapping a food photo opens the **lightbox gallery**
  - Delete with a confirm modal
- **Tables**:
  - Floor plan like a real dining room, with one tab per **floor level**
  - Counter, kitchen pass, windows and entrance zones on the first floor; "Stairs" when there is more than one floor
  - Selecting a table opens a dropdown with the name, seats, guests, seated time, orders with times and statuses, items, total, and the next action
  - **Arrange tables** mode lets staff drag tables with pointer events, or move them with arrow keys (Shift moves 5%). It is a separate mode so a tap during service never moves a table.
  - Table size follows the seat count: round for up to 2, square for 3 to 4, long for 5 or more
  - On phones (720 px and narrower) the floor plan becomes an expandable list, and arranging is desktop only
- **Settings**: tabs with full add, edit and delete for:
  - Payment methods
  - Discounts (percent off)
  - Users
  - User roles (which modules each role can open)
  - Food categories
  - **Tables** (name, seats 1–40, floor)
  - **Floor levels**

  Some deletes are blocked: a category with foods, a role with users, a floor with tables, the only floor, and a table that has guests.
- **Guest menu**:
  - Each dish shows its prep time ("About 20 min") and a small **Add** button
  - Tapping the photo opens a full-screen **lightbox gallery**: previous and next, thumbnails, zoom 100–400% (buttons, double-click, mouse wheel, pinch), drag to pan when zoomed, and arrow and +/- keys
  - The plate shows an **estimated wait**, which is the slowest dish's prep time, since dishes cook in parallel
  - The order tracker shows "Ready in about N min" until the order is completed
  - Kitchen cards show elapsed time against that target and turn overdue past it
  - Sample photos are drawn SVG stand-ins made by `samplePhoto()`
- **Guide**: one "From QR to clean table" flow card, plus a how-to card for each module and for the guest phone.

## Code map (`index.html`)

The app is plain JS with no framework. It re-renders the whole `#app` from state on every action.

- `S`: the single state object, holding every collection (`foods`, `categories`, `tables`, `floors`, `orders`, `plates`, `payments`, `discounts`, `users`, `roles`) and UI state (`view`, `mode`, `floor`, `layoutEdit`, filters, guest preview settings).
- `seed()`: creates sample data. It generates about 35 days of paid orders with a seeded RNG, plus a live floor with tables in every status.
- `TSTAT` / `OSTAT` / `KITCHEN` / `GSTEPS`: labels, colors, icons and guest wording for each status.
- `syncTable(t)`: derives a table's status from its current session's orders.
- `sessionOrders(t)`: returns the table's orders. An order belongs to a session through `order.session === table.token`.
- Views: `vDashboard`, `vOrders`, `vKitchen`, `vFoods`, `vTables` (with `tableShape`, `tableBody`), `vSettings`, `vGuide`, `staffShell`, and `guestShell` (with `gMenu`, `gPlate`, `gOrders`, `gBill`, `gClosed`).
- Settings use a generic config, `SET`. Each tab lists fields of type text, number, check, select or multi, plus an optional `extra` column, and `setModal` and `FORMS.set` handle all of them.
- Events use delegation:
  - `data-act="name"` → `ACT[name](dataset)`
  - `data-form` → `FORMS`
  - `data-change` → `CHANGE`
  - `data-input` → updates a state key
  - `data-drag` → table dragging
- `render()` keeps focus and the scroll position of elements marked `data-keep`.
- `modal(title, body, foot)` uses one `<dialog id="modal">`. `toast(msg)` shows a status toast.
- `qrSvg()` draws a **decorative** QR. It is not scannable.
- `orderEta(items)` returns the largest `eta` among the items. Orders store it as `order.eta` when they are created.
- The lightbox uses its own `<dialog id="lb">`, with state in `LB` and the functions `lbRender`, `lbApply`, `lbZoom` and `lbGo`.
- Money is in ₱ with two decimals, formatted by `peso()`. `total()` applies the order's discount percent, and a `console.assert` checks it.

## Design rules

- **Colors:** taken from `docs/FBS-Serve-Color-System.pdf`, as CSS tokens on `:root` with dark-mode overrides (system preference and `data-theme`).
  - Primary: Basil `#476818` (dark `#B8DF63`)
  - Accent: Magenta `#C42A93` (dark `#E35BBF`). Used for the focus ring, Best seller tag and bill-out alert.
  - Neutrals: Cool Gray. Canvas `#F4F6F8` and `#0F1115`, surface `#FFFFFF` and `#16191F`.
  - Status colors follow the PDF: new is blue, preparing is orange, ready is green, served is violet, paid is gray.
- **Deviations from the PDF, made for contrast:**
  - Magenta text on a pink tint uses Magenta 600 `#A51E7A`, because `#C42A93` there is 4.0:1.
  - Input borders use Gray 500 `#6B7584`, because `#C2C9D3` is too faint on white.
  - Table "Cleaning" is violet, not orange, so it stays distinct from "Ordering".
- **Font:** Instrument Sans. The owner chose it, and asked for **medium (500) instead of bold** everywhere, so there is no 700 weight in the UI.
- **Theme:** a sun/moon button in the top bar switches light and dark. The choice is saved in `localStorage` (`fbs-theme`). With no saved choice, the page follows the system setting.
- **Layout, from the Savora design guide (a private claude.ai design system the owner used first):**
  - Body text at least 16px, nothing under 14px
  - Tap targets at least 48px
  - Radius 8 (inputs), 12 (buttons), 20 (cards), pill (chips)
  - Spacing on a 4px base
  - Every status shows an icon and a label, never color alone
- **Copy:** the UI is in English, in sentence case. Buttons say what happens ("Activate and show QR", "Send to kitchen", "Payment received").

## Working with the owner

- The owner writes in Tagalog/Taglish. Replies have been in Taglish, but the UI stays English.
- The owner likes a short plan first, then the build. Ask before large scope changes.
- Commits so far are on `main`: initial UI, branding and colors, font, tables and floors with drag, and table activation.

## Not done yet / known limits

- No backend, database, auth or real roles. The Staff and Guest switch is a preview toggle, not a login.
- Nothing persists: drag positions, new foods and settings all reset on reload.
- The QR is **real** (`assets/qrcode.js`, qrcode-generator, MIT) and encodes `<page url>#t=<tableId>&k=<token>`. Opening that link shows only the guest phone screen for that table (the `guestOnly` mode, see the boot block at the end of `index.html`). But with no backend the phone gets its **own copy** of the sample data, so the kitchen and waiter on another device do not see its orders.
- Guest and staff screens are not synced across devices. They only appear linked inside one page.
- The "only one guest sends the plate" rule is only a confirm modal. A real version needs a server-side lock on the table's plate.
- There is no void or cancel order, no printing or receipts, and no reports beyond the dashboard. Reservations are in-memory like everything else, with no real notifications (only the in-app banner).
- Takeout pickup numbers do not reset each day, and a takeout phone on another device does not see the kitchen's updates (same no-backend limit as table QRs).

## Suggested next step (when the backend starts)

These collections map one to one to `S`:

- `tables` (with `floor`, `x`, `y`, `status`, `token`, `guests`)
- `floors`
- `orders` (with `items` snapshot, `session`, status timestamps, `payment`, `discount`)
- `plate_lines` (per table session)
- `foods`
- `categories`
- `payments`
- `discounts`
- `users`
- `roles`

Guests and the kitchen need realtime updates, through websockets or a realtime DB. Guests also need **public, unauthenticated access scoped by the table token**, while staff routes need auth and role checks.

## Variants in orders

A plate line is `{id, foodId, variantId?, qty, by}` and an order item is `{foodId, variantId?, name, price, qty}`, where `name` already reads "Classic Pizza (Large)" and `price` is the variant's price at the time of the order. Helpers: `hasV`, `unitPrice(f, vid)`, `itemName(f, vid)`, `lineName(l)`, `linePrice(l)`; `pickSheet()` is the guest picker: a bottom sheet drawn inside the phone frame (state `S.pick` and `S.pickV`), not a page-level dialog. Reports and the dashboard group by item name, so each variant counts separately.

## Notifications
Bell icon in the staff header with an unread badge and a dropdown (Mark all as read, Clear, click an item to open its module). `notify(icon, text, view)` pushes into `S.notifs` (last 40). Fired on: guest sends an order, takeout placed (counter or QR), kitchen order cooked, takeout ready for pickup, guest asks for the bill, table paid (cleanup), and a reservation coming due. The existing banners stay for actionable items (bill, reservation). In-browser only; real cross-device alerts need a backend.

## Orders: one bill per table
Dine-in orders from the same table session (first order plus additional orders) share one row in Orders, with a "+N additional" tag and a chevron that expands the individual orders (`groupRows`, `orderRowHtml`, `billOrders`). The group status is the least advanced unpaid order. Clicking the main row opens one payment modal for every unpaid order of the session (method, discount and split bill cover the total); payment opens only when all of them are served. Clicking an expanded child opens that order read-only. Takeout orders stay single rows.
