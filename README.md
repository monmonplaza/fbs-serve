# FBS Serve

Restaurant ordering and management UI: guests scan a table QR and order from their phone, staff run orders, kitchen, tables, reservations and payments.

React 19 + TypeScript + Vite. Data comes from a mock in-memory API (`src/api`), so the app runs without a server and resets on reload.

```bash
npm install
npm run dev        # http://localhost:8000
npm run build      # type-check and production build
```

- `prototype/index.html`: the original single-file prototype (the spec; open it with any static server).
- `docs/PORTING.md`: how the React code is organised and the rules for adding to it.
- `docs/BACKEND.md`: the API the backend has to provide. `docs/LARAVEL.md`: schema, routes and realtime for the Laravel backend. `docs/reusable-components-in-all-projects.md`: the team's conventions.
- `HANDOFF.md`: product notes, modules and known gaps.

## Connecting a backend

The UI only calls `api.<module>.<method>()` from `src/api/index.ts`. Each module (`catalog`, `orders`, `kitchen`, `tables`, `reservations`, `admin`, `guest`) is
a file that today mutates the in-memory `db`. Set `VITE_API_URL` (see `.env.example`) to use the HTTP modules; foods and categories are done, the rest follow `docs/LARAVEL.md`. To go live, replace a module's method bodies with `fetch` calls that return the same shapes
(see `src/api/types.ts`) and throw `ApiError` for rule violations. No screen needs to change. Business rules that already live in the mock
(`src/api/core.ts`: table status sync, split-bill settlement, takeout creation) must be reimplemented server-side.
