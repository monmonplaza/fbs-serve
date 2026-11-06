# Porting guide: prototype to React

`docs/prototype/index.html` is the original single-file app (plain JS, whole page re-rendered from one state object). `resources/js` is the React + TypeScript port, served by Laravel through Inertia.
The prototype is the **spec**: same screens, same wording, same behavior, same CSS class names. `resources/css/app.css` is the prototype's CSS, unchanged,
so markup must use the same class names to look identical.

Run it: `php artisan serve` and `npm run dev`. Check types: `npx tsc -b`. Build: `npm run build`. Tests: `php artisan test` (Pest).

## Architecture

Laravel at the repo root, Inertia + React in `resources/js`. Same layout as the school app (laravel-sub-sms).

```
app/Http/Controllers/v1/<Domain>/   Menu, Tables, Orders, Kitchen; BaseController is v1/BaseController.php. Guest phone: Controllers/Public/
app/Support/                        Money, OrderService, Settlement, TableSync (business rules, final static classes)
routes/web.php                      Inertia pages (one per module). routes/api.php: the JSON the pages read, under /api
resources/views/app.blade.php       the Inertia root view
resources/css/app.css               the prototype's CSS (inside @layer components) plus the Tailwind theme
resources/js/app.tsx                createInertiaApp; ResolvedLayout.tsx picks the layout, AppProviders.tsx holds React Query and the global hosts
resources/js/layouts/AppShell.tsx   staff shell: rail, banners, login redirect, guest-phone preview (`useUi().mode`)
resources/js/pages/<module>/<Module>Page.tsx   one page per route, default export. auth/LoginPage, guest/GuestPage
resources/js/components/            shared UI (Icon, Pill, Pager, ...) and <module>/ folders for each page's modals and tables
resources/js/api-service/           the backend boundary. The UI only talks to `api.<module>.<method>()` from index.ts
  <domain>/mock.ts, http.ts         in-memory module and its Laravel twin (catalog, orders, kitchen, tables, guest, admin; reservations is mock only)
  client.ts, http.ts, form-data.ts  axios instance, `createCrudResource`, FormData/query helpers
  mock/                             in-memory db, seed data, and the server-side rules shared by the mocks (core.ts)
resources/js/hooks/                 useApi.ts (React Query read hooks, useInvalidate), useNow, useSettingsTab, useReservationNotices
resources/js/context/               UI-only state (zustand): ui.ts (mode, view, bell, guest preview), modal.ts, toast.ts, print.ts
resources/js/lib/                   pure helpers: format, domain, constants, access, reservations, ordersHelpers, ...
resources/js/types/                 restaurant.ts (domain types), reusable/pagination.ts
docs/prototype/index.html           the original single-file app (the spec for behavior)
```

### Rules

1. **Business rules live in `resources/js/api-service/*`, not in components.** In the prototype an action mutates `S` directly (for example `ACT.serve`). In the port that
   becomes an async method on the right api module that mutates `db` (the mock backend) and returns a copy via `out()`. Components call it, then
   `await invalidate('orders', 'tables')` (from `useInvalidate()`), then `toast(...)` / `closeModal()`. A real backend would replace the method body with
   a `fetch`; the component must not change. Throw `fail('message')` (ApiError) for rule violations; the caller shows `err.message` in a toast.
2. **Reads** use the hooks in `resources/js/hooks/useApi.ts` (`useOrders()` returns `{ data }`, `data` is `[]` while loading). Add a new read hook there only if
   your module needs a resource that is missing (append, do not reorder), plus its key in `keys`.
3. **UI state** (filters, open rows, form drafts) is local `useState`, or `useUi` for state shared across screens. Never put server data in zustand.
4. **Modals**: `openModal({ title, wide?, content })` from `@/store/modal`. `content` is the body and footer exactly as in the prototype
   (`<div className="m-body">..</div><div className="m-foot">..</div>`, a `<form>` may wrap both). Pass a component element so it can use hooks and
   stay live: `openModal({ title: 'X', content: <MyModal id={id} /> })`, and read fresh data inside it with the query hooks.
   Use `closeModal()` to close. Toasts: `toast('message')`.
5. **Notifications (bell)**: call `useUi.getState().notify(icon, text, view)` after the same events the prototype calls `notify(...)`. Search the prototype for `notify(`.
6. **Types**: no `any`. Use the types in `resources/js/types/restaurant.ts`; extend them there (append only) if the prototype needs a field that is missing.
7. **Text and behavior**: keep every label, message, empty state, aria-label, keyboard shortcut and edge case of the prototype. Keep Taglish out of the UI (it is English).
8. **Time-based UI** (minutes ago, reminders): call `useNow()` from `@/hooks/useNow` so it re-renders.
9. **File ownership**: only edit the files your task owns. Shared files (`components/*`, `lib/*`, `types/restaurant.ts`, `hooks/useApi.ts`, `api-service/mock/core.ts`, `context/*`, `layouts/*`)
   may only be extended by appending, and only when needed. Put module-specific helpers inside your own feature folder. New shared components get a new file.
10. Keep files focused (a page file over ~400 lines should be split into the page plus modal/helper files in the same folder).

## Styling (Tailwind v4)

Tailwind v4 is installed through `@tailwindcss/vite` (`vite.config.ts`). The existing component CSS is unchanged and lives in `resources/css/app.css`, now inside `@layer components`, so any utility class overrides it.

- **Layers:** `theme, base, components, utilities`. Only `tailwindcss/theme.css` and `tailwindcss/utilities.css` are imported; **preflight is left out on purpose** so existing screens keep their look. `@layer base` holds the app's own reset and the color variables.
- **Tokens:** `@theme inline` in `app.css` maps the runtime CSS variables to utilities: `bg-card`, `bg-page`, `text-ink`, `text-ink-muted`, `border-hairline`, `bg-brand`, `text-on-brand`, `bg-success-tint`, `text-error`, `bg-nav`, `rounded-sm|md|lg|pill`, `shadow-card`, `shadow-lift`, `font-sans`, and so on. Colors point at the variables, so light and dark mode switch without `dark:` classes. `dark:` exists (saved theme, else the system setting) for the rare case that needs it.
- **New components:** use utility classes with these tokens. Do not add new rules to `app.css`; when you touch an old component and it is simple, moving its rules to utilities is welcome, one component at a time.
- **Dev note:** Tailwind finds class names in files the app imports. A class that exists only in a file nothing imports is not generated; `npm run build` always scans everything.
