# FBS Serve

Laravel 13 + Inertia v3 + React 19 + TypeScript. Laravel at the repo root, React in `resources/js` (same layout as laravel-sub-sms). The original prototype is `docs/prototype/index.html` (the spec for behavior).
Product scope and module notes: `HANDOFF.md`. Code layout and rules: `docs/PORTING.md`. How to run it: `README.md`.

## Backend preparation

Read these before touching `resources/js/api-service/`, adding a module, or designing endpoints:

- `docs/reusable-components-in-all-projects.md`: the team's conventions (CRUD template, `{ success, message, data }` envelope, `createCrudResource`, `app_` table prefix, Octane/Coolify deployment, PHP extensions). Section 13 lists code not to copy.
- `docs/LARAVEL.md`: how this app maps onto those conventions (schema, routes, realtime).
- `docs/BACKEND.md`: the API contract and the business rules the server must enforce.

## Rules

- The UI only talks to the backend through `resources/js/api-service/index.ts`. Keep method names and return shapes identical between a module's `mock.ts` and `http.ts`.
- Use `api-service/http.ts` (`createCrudResource`) for new HTTP modules. Do not call axios or `fetch` from components.
- Pages are `resources/js/pages/<module>/<Module>Page.tsx` with a default export, registered in `routes/web.php`. Their modals and tables go in `components/<module>/`, helpers in `lib/`, hooks in `hooks/`. Import with the `@/` alias.
- JSON endpoints live in `routes/api.php` under `/api`; controllers in `app/Http/Controllers/v1/<Domain>/` extend `v1/BaseController`; business rules in `app/Support`.
- New tables use literal `app_` names with an explicit `$table`; never combine with `DB_PREFIX`.
- Use `toast()` and `openModal` confirmations, never `alert` or `window.confirm`.
- Styling is Tailwind v4 (see "Styling" in `docs/PORTING.md`): new UI uses utility classes with the theme tokens; the old component CSS stays in `resources/css/app.css` under `@layer components`.
- Style: 4 spaces, semicolons, double quotes in `resources/js` (Prettier flags `--tab-width 4 --print-width 120 --trailing-comma all`); `vendor/bin/pint` for PHP; Pest for tests.
- Before committing: `npx tsc -b`, `php artisan test`, `vendor/bin/pint --test`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
