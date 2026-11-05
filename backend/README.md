# FBS Serve backend (Laravel 13)

Foods, categories, tables, orders, kitchen and payments for the React app in `../src`. Follows `../docs/reusable-components-in-all-projects.md`:
literal `app_` table names with explicit `$table`, `BaseController` + `Route::crudModule`, the `{ success, message, data }` envelope, business rules in `app/Services`.
Contract and rules: `../docs/BACKEND.md`. Schema and routes: `../docs/LARAVEL.md`.

## Run it

```bash
cd backend
composer install
cp .env.example .env && php artisan key:generate   # first time only
php artisan migrate:fresh --seed                   # starter menu, tables, Table 4 seated with QR token abc123
php artisan serve --port=8001
```

Then start the frontend against it (the default stays the in-memory mock):

```bash
VITE_API_URL=http://localhost:8001/api npm run dev
```

Guest QR for the seeded table: `http://localhost:8000/#t=4&k=abc123`. `CORS_ALLOWED_ORIGINS` in `.env` lists the frontend origins.

## Tests

```bash
php artisan test
```

## Notes

- **Staff routes have no login yet**, so `App\Http\Middleware\DevOpen` answers 403 outside `local` and `testing`. Add Sanctum login and the role policies before any deploy.
- One order per table session; each send to the kitchen is a round of it (`app_order_rounds`).
- Dev database is SQLite (`database/database.sqlite`). Production is PostgreSQL + Redis per the conventions; run the suite against PostgreSQL before relying on it.
- Tests use PHPUnit (the skeleton's default), not Pest.
- `database/seeders/menu.json` is the prototype's menu exported from `src/api/seedData.ts`.
