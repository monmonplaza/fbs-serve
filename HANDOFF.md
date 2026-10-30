# FBS Serve — Handoff

Last updated: 2026-10-26. Read this file first when continuing on a new machine or account.

## What this is

FBS Serve is a restaurant management web app. Guests order from their table by scanning a QR code. The order then moves through the kitchen, the waiter serves it, and the guest pays.

**Current state:** a clickable **UI prototype only**. It has no backend, no database and no login. All data is sample data held in page memory, and it resets on every reload. The owner asked for "UI and simple modals first, no backend yet".

- Repo: https://github.com/monmonplaza/fbs-serve (branch `main`)
- Live preview: a claude.ai Artifact owned by the original account. It is **private**, so a different account cannot open it. Run the app locally instead (see below).

## Run it

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
| `docs/FBS-Serve-Color-System.pdf` | Owner's color system v1.0 (source of all colors) |
| `HANDOFF.md` | This file |

## The order process (as built)

The owner's six steps, plus one rule the owner added later: **step 0, activation, always comes first.**

0. Guests sit at an **inactive** table. The waiter selects it in **Tables** and taps **Activate table**, then enters the number of guests. The table becomes **Active**, and only then is its QR code shown. A guest who scans an inactive table sees "Table N is not active yet. Ask your waiter to activate this table."
1. Every guest at the table scans the **same QR**. They all add items to one shared **plate**. Never call it a "cart"; the owner asked for "plate". **One guest** taps **Send to kitchen**, and a confirm modal explains that only one person sends it. The table becomes **Ordering**.
2. The **Kitchen** kanban shows the oldest order first: Queued → Preparation → Cooking → Plating → Completed. The guest's phone shows a Foodpanda-style tracker: Order received, Preparation, Cooking, **Plating your food** (the owner's chosen wording), Ready, Served.
3. Every order also appears in **Orders**. Order status drives table status (see `syncTable`).
4. The waiter brings the food and taps **Mark as served** (in Kitchen or in the table dropdown). When every order is served, the table becomes **Eating**.
5. The guest taps **Bill out** and picks an active payment method. The table becomes **Bill out**: a magenta alert banner appears for staff and the table pulses on the floor plan. The waiter opens **Receive payment**, can apply a discount, and confirms. The orders become **Paid** and the table becomes **Cleaning**.
6. After cleaning, the waiter taps **Mark as clean**. The table becomes **Inactive** and the old QR token is invalidated.

Table statuses: `inactive → active → ordering → eating → billout → cleaning → inactive`.
Order statuses: `queued → preparation → cooking → plating → completed → served → paid`.

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
- The QR is decorative. Real QR codes need a library and a real URL such as `/t/<tableId>?k=<token>`.
- Guest and staff screens are not synced across devices. They only appear linked inside one page.
- The "only one guest sends the plate" rule is only a confirm modal. A real version needs a server-side lock on the table's plate.
- There is no void or cancel order, no reservations, no printing or receipts, and no reports beyond the dashboard.

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
