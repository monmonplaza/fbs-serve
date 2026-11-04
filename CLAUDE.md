# FBS Serve

React 19 + TypeScript + Vite frontend in `src/`, mock in-memory API in `src/api/`. The original prototype is `prototype/index.html` (the spec for behavior).
Product scope and module notes: `HANDOFF.md`. Code layout and rules: `docs/PORTING.md`.

## Backend preparation

The backend will be Laravel (same stack as the other projects). Read these before touching `src/api/`, adding a module, or designing endpoints:

- `docs/reusable-components-in-all-projects.md`: the team's conventions (CRUD template, `{ success, message, data }` envelope, `createCrudResource`, `app_` table prefix, Octane/Coolify deployment, PHP extensions). Section 13 lists code not to copy.
- `docs/LARAVEL.md`: how this app maps onto those conventions (schema, routes, realtime).
- `docs/BACKEND.md`: the API contract and the business rules the server must enforce.

## Rules

- The UI only talks to the backend through `src/api/index.ts`. Keep method names and return shapes identical between the mock and the HTTP version of a module.
- Use `src/api/http/crud.ts` (`createCrudResource`) for new HTTP modules. Do not call axios or `fetch` from components.
- New tables use literal `app_` names with an explicit `$table`; never combine with `DB_PREFIX`.
- Use `useToast`-style feedback (`toast()`) and `openModal` confirmations, never `alert` or `window.confirm`.
- Check types with `npx tsc --noEmit -p .` before committing.
