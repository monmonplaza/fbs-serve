# FBS Serve

Restaurant ordering and management app: guests scan a table QR and order from their phone, staff run orders, kitchen, tables, reservations and payments.

Laravel 13 + Inertia v3 + React 19 + TypeScript + Vite + Tailwind v4. The folder layout and coding style follow the school app (laravel-sub-sms): Laravel at the repo root, React in `resources/js`.

## Run it

```bash
composer install
cp .env.example .env && php artisan key:generate   # first time only
touch database/database.sqlite
php artisan migrate:fresh --seed                   # starter menu, tables, Table 4 seated with QR token abc123
npm install
npm run dev                                        # Vite, in one terminal
php artisan serve                                  # the app, in another
```

By default the pages run on the in-memory mock API (`resources/js/api-service/mock`), which resets on reload. Set `VITE_API_URL=/api` in `.env` (and restart Vite) to use the Laravel API instead; every module then runs on it (the demo roles, users and a few bookings come from `RestaurantSeeder`).

To let phones on the same Wi-Fi use the app, run:

```bash
php artisan serve:wifi
```

It finds this computer's current Wi-Fi address (the router can change it) and uses it as `APP_URL`, so the QR codes always point to it; it prints the address to open on the phones. It serves the built files (rebuilding them when the source is newer) and ignores `public/hot` from `npm run dev`, which points phones at `[::1]:5173`. It runs 8 workers, because the default server handles one request at a time and phones queue behind each other. SQLite is set up for several writers (`DB_BUSY_TIMEOUT`, WAL, `IMMEDIATE` transactions in `config/database.php`), and the cache uses files so rate-limit counters do not write to the database. In production use PostgreSQL, Octane and Redis as in `docs/LARAVEL.md`; `TRUSTED_PROXIES` makes the guest rate limit count each phone by its own address behind the proxy.

Set `APP_URL` in `.env` to the restaurant's web address before printing table QR codes (Tables → Print QR codes): the QR codes point there. While it is `localhost`, they use the address in the browser.

Uploaded pictures (food photos, payment QR codes) go to DigitalOcean Spaces through Laravel's `s3` disk (`FILESYSTEM_DISK=s3`). Fill in `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_BUCKET` in `.env`, then run `php artisan config:clear`. Files are private and stored under `AWS_BUCKET_FOLDER` (`fbs-serve`); the API shows short-lived links. Until the keys are set, uploads fail.

Guest QR for the seeded table: `/guest#t=4&k=abc123`. Takeout QR: `/guest#takeout`.

```bash
php artisan test      # Pest
npx tsc -b            # types
npm run build         # production build
```

## Layout

- `app/Http/Controllers/v1/<Domain>`: Menu, Tables, Orders, Kitchen (`BaseController` + `Route::crudModule`); `Public/` is the guest phone. `app/Support`: business rules.
- `routes/web.php`: Inertia pages. `routes/api.php`: JSON under `/api`.
- `resources/js`: `pages`, `layouts`, `components`, `api-service`, `hooks`, `context`, `lib`, `types`. See `docs/PORTING.md`.
- `docs/prototype/index.html`: the original single-file prototype (the spec for behavior).
- `docs/BACKEND.md`: the API contract. `docs/LARAVEL.md`: schema, routes and realtime. `docs/reusable-components-in-all-projects.md`: the team's conventions. `HANDOFF.md`: product notes.

## Notes

- Staff routes have no login yet, so `App\Http\Middleware\DevOpen` answers 403 outside `local` and `testing`. Add Sanctum login and role policies before any deploy.
- One order per table session; each send to the kitchen is a round of it (`app_order_rounds`).
- Dev database is SQLite. Production is PostgreSQL + Redis per the conventions; run the suite against PostgreSQL before relying on it.
