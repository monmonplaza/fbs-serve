# Porting guide: prototype to React

`prototype/index.html` is the original single-file app (plain JS, whole page re-rendered from one state object). `src/` is the React + TypeScript port.
The prototype is the **spec**: same screens, same wording, same behavior, same CSS class names. `src/styles/app.css` is the prototype's CSS, unchanged,
so markup must use the same class names to look identical.

Run it: `npm run dev` (http://localhost:8000). Check types: `npx tsc --noEmit -p .`. Build: `npx vite build`.

## Architecture

```
src/api/        the backend boundary. The UI only talks to `api.<module>.<method>()`.
  types.ts      domain types (what the backend returns)
  db.ts         in-memory database (mock backend). seed.ts / seedData.ts build the sample data.
  core.ts       server-side rules shared by the mocks: syncTable, settleOrders, newTakeout, sessionOrders, ApiError, out()
  catalog.ts orders.ts tables.ts reservations.ts admin.ts guest.ts    one mock module per area; add methods here
  queries.ts    React Query read hooks (useOrders, useTables, ...) and useInvalidate()
src/store/      UI-only state (zustand): ui.ts (mode, view, bell, guest preview), modal.ts (openModal/closeModal), toast.ts (toast())
src/components/ shared UI: Icon, Pill, Pager/usePaged, RowActions, QrCode, ModalHost, Toast
src/lib/        pure helpers: format.ts (peso, tm, dt, mins, sum, r2), domain.ts (prices, totals, plateItems), reservations.ts, useNow.ts
src/features/<module>/   one folder per module; the page component plus its modals and helpers
src/app/        shell: App, StaffShell (rail, banners, routing by `useUi().view`), TopBar (bell, theme, account)
```

### Rules

1. **Business rules live in `src/api/*`, not in components.** In the prototype an action mutates `S` directly (for example `ACT.serve`). In the port that
   becomes an async method on the right api module that mutates `db` (the mock backend) and returns a copy via `out()`. Components call it, then
   `await invalidate('orders', 'tables')` (from `useInvalidate()`), then `toast(...)` / `closeModal()`. A real backend would replace the method body with
   a `fetch`; the component must not change. Throw `fail('message')` (ApiError) for rule violations; the caller shows `err.message` in a toast.
2. **Reads** use the hooks in `src/api/queries.ts` (`useOrders()` returns `{ data }`, `data` is `[]` while loading). Add a new read hook there only if
   your module needs a resource that is missing (append, do not reorder), plus its key in `keys`.
3. **UI state** (filters, open rows, form drafts) is local `useState`, or `useUi` for state shared across screens. Never put server data in zustand.
4. **Modals**: `openModal({ title, wide?, content })` from `@/store/modal`. `content` is the body and footer exactly as in the prototype
   (`<div className="m-body">..</div><div className="m-foot">..</div>`, a `<form>` may wrap both). Pass a component element so it can use hooks and
   stay live: `openModal({ title: 'X', content: <MyModal id={id} /> })`, and read fresh data inside it with the query hooks.
   Use `closeModal()` to close. Toasts: `toast('message')`.
5. **Notifications (bell)**: call `useUi.getState().notify(icon, text, view)` after the same events the prototype calls `notify(...)`. Search the prototype for `notify(`.
6. **Types**: no `any`. Use the types in `src/api/types.ts`; extend them there (append only) if the prototype needs a field that is missing.
7. **Text and behavior**: keep every label, message, empty state, aria-label, keyboard shortcut and edge case of the prototype. Keep Taglish out of the UI (it is English).
8. **Time-based UI** (minutes ago, reminders): call `useNow()` from `@/lib/useNow` so it re-renders.
9. **File ownership**: only edit the files your task owns. Shared files (`src/components/*`, `src/lib/*`, `src/api/types.ts`, `queries.ts`, `core.ts`, `store/*`, `app/*`)
   may only be extended by appending, and only when needed. Put module-specific helpers inside your own feature folder. New shared components get a new file.
10. Keep files focused (a page file over ~400 lines should be split into the page plus modal/helper files in the same folder).
