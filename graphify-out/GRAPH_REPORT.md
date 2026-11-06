# Graph Report - fbs-serve  (2026-11-06)

## Corpus Check
- 192 files · ~102,514 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1160 nodes · 1570 edges · 155 communities (110 shown, 45 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ea944c00`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Illuminate\Http\Request
- devDependencies
- Illuminate\Database\Migrations\Migration
- restaurant.ts
- scripts
- reservationHelpers.ts
- User
- useApi.ts
- compilerOptions
- PaymentMethod
- Illuminate\Database\Eloquent\Model
- bootstrap/app.php
- FBS Serve — Handoff
- reservationActions.tsx
- Illuminate\Http\Resources\Json\JsonResource
- Illuminate\Database\Eloquent\Relations\BelongsTo
- Food
- compilerOptions
- constants.ts
- domain.ts
- core.ts
- ResolvedLayout.tsx
- PayModals.tsx
- Order
- require
- OrderRound
- Reusable Component Boilerplate Report
- seed.ts
- reservations.ts
- FloorController
- require-dev
- seedData.ts
- Lightbox.tsx
- ordersColumns.ts
- ordersHelpers.tsx
- index.ts
- settingsConfig.tsx
- api.php
- DiscountController.php
- composer.json
- _this
- 7. New CRUD module template
- reservations/mock.ts
- Calendar.tsx
- foodDisplay.tsx
- config
- Laravel backend plan
- 10. Deployment: Octane / FrankenPHP / Coolify
- TopBar.tsx
- ReservationsPage.tsx
- DiningTable
- AppServiceProvider
- 11. Table prefix convention `app_`
- client.ts
- guest/http.ts
- orders/mock.ts
- TableBody.tsx
- modal.ts
- LoginPage.tsx
- FoodsPage.tsx
- OrdersPage.tsx
- pagination.ts
- psr-4
- logging.php
- sanctum.php
- Backend contract
- Porting guide: prototype to React
- 12. PHP extensions and environment parity
- 13. Do not copy: known defects
- 16. Using this document with Claude and other AI tools
- 4. Component catalog
- 5. Data layer boilerplate
- TestCase
- FBS Serve
- admin/mock.ts
- OrdersTable.tsx
- Pager.tsx
- ui.ts
- SettingsPage.tsx
- TablesPage.tsx
- Laravel Application
- PaymentMethodController
- FBS Serve
- 6. Backend CRUD boilerplate
- 9. Conventions
- admin/http.ts
- catalog/http.ts
- catalog/mock.ts
- api-service/http.ts
- kitchen/mock.ts
- FoodModals.tsx
- GuestShell.tsx
- ModalHost.tsx
- RowActions.tsx
- QrModal.tsx
- print.ts
- toast.ts
- GuidePage.tsx
- autoload-dev
- extra
- keywords
- console.php
- guest/mock.ts
- kitchen/http.ts
- orders/http.ts
- tables/mock.ts
- ChannelTag.tsx
- ColFilter.tsx
- PayForm.tsx
- StatusDot.tsx
- useReservationNotices.ts
- useSettingsTab.ts
- guestStore.ts
- iconPaths.ts
- theme.ts
- KitchenPage
- tsconfig.json
- db.ts
- tables/http.ts
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `BaseController` - 48 edges
2. `OrderService` - 21 edges
3. `Order` - 20 edges
4. `Food` - 18 edges
5. `Reusable Component Boilerplate Report` - 18 edges
6. `TableController` - 17 edges
7. `DiningTable` - 17 edges
8. `OrderRound` - 17 edges
9. `FBS Serve — Handoff` - 17 edges
10. `Settlement` - 15 edges

## Surprising Connections (you probably didn't know these)
- `add()` --calls--> `Food`  [EXTRACTED]
  tests/Support/OrderingHelpers.php → app/Models/Food.php
- `CategoryController` --inherits--> `BaseController`  [EXTRACTED]
  app/Http/Controllers/v1/Menu/CategoryController.php → app/Http/Controllers/v1/BaseController.php
- `FoodController` --inherits--> `BaseController`  [EXTRACTED]
  app/Http/Controllers/v1/Menu/FoodController.php → app/Http/Controllers/v1/BaseController.php
- `DiscountController` --inherits--> `BaseController`  [EXTRACTED]
  app/Http/Controllers/v1/Orders/DiscountController.php → app/Http/Controllers/v1/BaseController.php
- `PaymentMethodController` --inherits--> `BaseController`  [EXTRACTED]
  app/Http/Controllers/v1/Orders/PaymentMethodController.php → app/Http/Controllers/v1/BaseController.php

## Import Cycles
- None detected.

## Communities (155 total, 45 thin omitted)

### Community 0 - "Illuminate\Http\Request"
Cohesion: 0.06
Nodes (19): ApiException, Controller, GuestController, BaseController, KitchenController, OrderController, TableController, OrderRoundResource (+11 more)

### Community 1 - "devDependencies"
Cohesion: 0.04
Nodes (44): axios, @inertiajs/react, @inertiajs/vite, laravel-vite-plugin, dependencies, axios, @inertiajs/react, qrcode-generator (+36 more)

### Community 2 - "Illuminate\Database\Migrations\Migration"
Cohesion: 0.10
Nodes (3): Illuminate\Database\Migrations\Migration, Illuminate\Database\Schema\Blueprint, Illuminate\Support\Facades\Schema

### Community 3 - "restaurant.ts"
Cohesion: 0.07
Nodes (26): AppliedDiscount, AppSettings, Category, Database, DiningTable, Discount, Floor, Food (+18 more)

### Community 4 - "scripts"
Cohesion: 0.08
Nodes (26): scripts, dev, post-autoload-dump, post-create-project-cmd, post-root-package-install, post-update-cmd, pre-package-uninstall, setup (+18 more)

### Community 5 - "reservationHelpers.ts"
Cohesion: 0.13
Nodes (15): addDays(), draftKey(), DraftStore, hm(), initDraft(), OrderDraft, pad2(), ResDraft (+7 more)

### Community 6 - "User"
Cohesion: 0.12
Nodes (12): User, UserFactory, Illuminate\Database\Eloquent\Attributes\Fillable, Illuminate\Database\Eloquent\Attributes\Hidden, Illuminate\Database\Eloquent\Factories\Factory, Illuminate\Database\Eloquent\Factories\HasFactory, Illuminate\Foundation\Auth\User, Illuminate\Notifications\Notifiable (+4 more)

### Community 7 - "useApi.ts"
Cohesion: 0.10
Nodes (4): clientRef, EMPTY, KeyName, keys

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, resources/js, compilerOptions, baseUrl, isolatedModules, jsx, lib (+11 more)

### Community 9 - "PaymentMethod"
Cohesion: 0.16
Nodes (6): Category, Discount, PaymentMethod, DatabaseSeeder, RestaurantSeeder, Illuminate\Database\Seeder

### Community 10 - "Illuminate\Database\Eloquent\Model"
Cohesion: 0.20
Nodes (6): FoodController, FoodPhoto, FoodVariant, OrderItem, OrderPayment, Illuminate\Database\Eloquent\Model

### Community 11 - "bootstrap/app.php"
Cohesion: 0.13
Nodes (11): DevOpen, HandleInertiaRequests, Closure, Illuminate\Database\Eloquent\ModelNotFoundException, Illuminate\Foundation\Application, Illuminate\Foundation\Configuration\Exceptions, Illuminate\Foundation\Configuration\Middleware, Illuminate\Validation\ValidationException (+3 more)

### Community 12 - "FBS Serve — Handoff"
Cohesion: 0.11
Nodes (17): Code map (`index.html`), Design rules, FBS Serve — Handoff, Files, Modules, Not done yet / known limits, Notifications, Orders: one bill per table (+9 more)

### Community 13 - "reservationActions.tsx"
Cohesion: 0.20
Nodes (13): attempt(), markNoShow(), moveToDay(), openCancel(), openMove(), openRes(), openResForm(), openSeatModal() (+5 more)

### Community 14 - "Illuminate\Http\Resources\Json\JsonResource"
Cohesion: 0.16
Nodes (6): CategoryResource, FloorResource, FoodResource, PaymentMethodResource, Illuminate\Http\Resources\Json\JsonResource, Illuminate\Validation\Rule

### Community 15 - "Illuminate\Database\Eloquent\Relations\BelongsTo"
Cohesion: 0.16
Nodes (3): TableSession, Illuminate\Database\Eloquent\Relations\BelongsTo, Illuminate\Database\Eloquent\Relations\HasOne

### Community 16 - "Food"
Cohesion: 0.17
Nodes (4): Food, Illuminate\Database\Eloquent\Relations\HasMany, add(), url()

### Community 17 - "compilerOptions"
Cohesion: 0.13
Nodes (14): node, vite.config.ts, compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck (+6 more)

### Community 18 - "constants.ts"
Cohesion: 0.14
Nodes (14): GSTEP_L, GSTEPS, KITCHEN, NAV, OrderStatusMeta, OSTAT, StatusMeta, TAGS (+6 more)

### Community 19 - "domain.ts"
Cohesion: 0.24
Nodes (10): billKey(), hasV(), isTO(), itemName(), oMeta(), plateItems(), subtotal(), total() (+2 more)

### Community 20 - "core.ts"
Cohesion: 0.19
Nodes (6): ApiError, newTakeout(), nextId(), nextPickup(), sessionOrders(), syncTable()

### Community 21 - "ResolvedLayout.tsx"
Cohesion: 0.22
Nodes (6): AppProviders(), client, AppShell(), isBare(), ResolvedLayout(), withResolvedLayout()

### Community 22 - "PayModals.tsx"
Cohesion: 0.28
Nodes (10): fail(), HandoverModal(), isPayable(), openOrder(), openPickup(), OrderModal(), PayTableModal(), PickupModal() (+2 more)

### Community 24 - "require"
Cohesion: 0.17
Nodes (12): require, ext-bcmath, ext-curl, ext-fileinfo, ext-mbstring, ext-openssl, ext-pdo_sqlite, inertiajs/inertia-laravel (+4 more)

### Community 27 - "Reusable Component Boilerplate Report"
Cohesion: 0.18
Nodes (10): 14. Gaps and next steps, 15. Team onboarding checklist, 1. How to use this document, 2. Stack baseline, 3. Portability tiers, 8.1 React (recommended), 8.2 Server side (emails, PDFs), optional, 8. Markdown rendering boilerplate (+2 more)

### Community 28 - "seed.ts"
Cohesion: 0.33
Nodes (9): createDatabase(), nextId(), nextPickup(), PHOTO_COLORS, rng(), samplePhoto(), seedOrders(), seedReservations() (+1 more)

### Community 29 - "reservations.ts"
Cohesion: 0.20
Nodes (7): REMIND_AFTER, REMIND_BEFORE, RES_MIN, resLive(), resProblem(), SHOW_AFTER, SHOW_BEFORE

### Community 31 - "require-dev"
Cohesion: 0.20
Nodes (10): require-dev, fakerphp/faker, laravel/pail, laravel/pao, laravel/pint, mockery/mockery, nunomaduro/collision, pestphp/pest (+2 more)

### Community 32 - "seedData.ts"
Cohesion: 0.20
Nodes (9): categories, discounts, floors, foods, payments, roles, tablePlan, tables (+1 more)

### Community 33 - "Lightbox.tsx"
Cohesion: 0.27
Nodes (7): closeGallery(), FoodGallery, Lightbox, LightboxHost(), PhoneLightbox(), Scope, useLightbox

### Community 35 - "ordersColumns.ts"
Cohesion: 0.24
Nodes (7): blankAll(), cfBlank(), cfMatch(), cfOn(), Col, ColValue, FLOW

### Community 36 - "ordersHelpers.tsx"
Cohesion: 0.22
Nodes (3): CHAN, chanOf(), ChTag()

### Community 37 - "index.ts"
Cohesion: 0.22
Nodes (7): admin, api, catalog, guest, kitchen, orders, tables

### Community 38 - "settingsConfig.tsx"
Cohesion: 0.22
Nodes (6): Cfg, Field, Opts, Row, SET, TAB_ORDER

### Community 41 - "composer.json"
Cohesion: 0.25
Nodes (7): description, license, minimum-stability, name, prefer-stable, $schema, type

### Community 43 - "7. New CRUD module template"
Cohesion: 0.25
Nodes (8): 7.1 Migration, 7.2 Model, 7.3 Policy and resource, 7.4 Controller and route, 7.5 Service, 7.6 Page skeleton (list view only), 7.7 Test skeleton (Pest), 7. New CRUD module template

### Community 45 - "Calendar.tsx"
Cohesion: 0.54
Nodes (7): byDayMap(), Chip(), dragProps(), dropProps(), MonthView(), stop(), WeekView()

### Community 46 - "foodDisplay.tsx"
Cohesion: 0.29
Nodes (3): CAT_IC, catIdx(), FoodImage()

### Community 47 - "config"
Cohesion: 0.29
Nodes (7): pestphp/pest-plugin, php-http/discovery, config, allow-plugins, optimize-autoloader, preferred-install, sort-packages

### Community 48 - "Laravel backend plan"
Cohesion: 0.29
Nodes (6): Environment, How the frontend connects, Laravel backend plan, Realtime, Routes: standard CRUD plus actions, Tables (section 11: literal `app_` names, explicit `$table`, full names in `exists:` / `unique:`)

### Community 49 - "10. Deployment: Octane / FrankenPHP / Coolify"
Cohesion: 0.29
Nodes (7): 10.1 Topology, 10.2 Dockerfile skeleton, 10.3 `scripts/deploy.sh` skeleton (web container start), 10.4 Environment keys (names only), 10.5 Octane-safety checklist, 10.6 Rolling-deploy rules, 10. Deployment: Octane / FrankenPHP / Coolify

### Community 50 - "TopBar.tsx"
Cohesion: 0.48
Nodes (5): AccountMenu(), ago(), Bell(), initials(), useDismiss()

### Community 54 - "11. Table prefix convention `app_`"
Cohesion: 0.33
Nodes (6): 11.1 What lss-v3 does (*Reported*), 11.2 Rule for the boilerplate, 11.3 Checklist for a new table, 11.4 Gotchas (from lss-v3, *Reported* unless noted), 11.5 sms today: no prefix (*Verified*), 11. Table prefix convention `app_`

### Community 55 - "client.ts"
Cohesion: 0.33
Nodes (3): API_URL, http, USE_HTTP

### Community 56 - "guest/http.ts"
Cohesion: 0.40
Nodes (4): guestHttp, joined, q(), tokenFor()

### Community 58 - "TableBody.tsx"
Cohesion: 0.40
Nodes (4): SHOW_AFTER, SHOW_BEFORE, TableBody(), tableOverLimit()

### Community 59 - "modal.ts"
Cohesion: 0.33
Nodes (3): ModalSpec, ModalState, useModalStore

### Community 60 - "LoginPage.tsx"
Cohesion: 0.47
Nodes (5): greeting(), LoginPage(), MARQUEE, PHRASES, useTyped()

### Community 61 - "FoodsPage.tsx"
Cohesion: 0.47
Nodes (3): delFood(), editFood(), FoodsPage()

### Community 62 - "OrdersPage.tsx"
Cohesion: 0.40
Nodes (4): groupRows(), OrdersPage(), RANGES, TYPES

### Community 63 - "pagination.ts"
Cohesion: 0.33
Nodes (5): ApiEnvelope, CrudQueryParams, LookupOption, PaginatedResponse, PaginationMeta

### Community 64 - "psr-4"
Cohesion: 0.40
Nodes (5): autoload, psr-4, App\\, Database\\Factories\\, Database\\Seeders\\

### Community 65 - "logging.php"
Cohesion: 0.40
Nodes (4): Monolog\Handler\NullHandler, Monolog\Handler\StreamHandler, Monolog\Handler\SyslogUdpHandler, Monolog\Processor\PsrLogMessageProcessor

### Community 66 - "sanctum.php"
Cohesion: 0.40
Nodes (4): Illuminate\Cookie\Middleware\EncryptCookies, Illuminate\Foundation\Http\Middleware\ValidateCsrfToken, Laravel\Sanctum\Http\Middleware\AuthenticateSession, Laravel\Sanctum\Sanctum

### Community 67 - "Backend contract"
Cohesion: 0.40
Nodes (4): Backend contract, Not covered yet, Realtime, Rules the server must enforce

### Community 68 - "Porting guide: prototype to React"
Cohesion: 0.40
Nodes (4): Architecture, Porting guide: prototype to React, Rules, Styling (Tailwind v4)

### Community 69 - "12. PHP extensions and environment parity"
Cohesion: 0.40
Nodes (5): 12.1 What is wrong today (*Verified* in sms; lss-v3 *Reported*), 12.2 Standard extension set (derived from real usage), 12.3 Recommended boilerplate, 12.4 Windows developer setup, 12. PHP extensions and environment parity

### Community 70 - "13. Do not copy: known defects"
Cohesion: 0.40
Nodes (5): 13.1 sms: frontend, 13.2 sms: backend, 13.3 sms: deployment, 13.4 lss-v3 (*Reported*), 13. Do not copy: known defects

### Community 71 - "16. Using this document with Claude and other AI tools"
Cohesion: 0.40
Nodes (5): 16.1 What it answers, 16.2 What it does not answer, 16.3 Make Claude read it, 16.4 Keep it accurate, 16. Using this document with Claude and other AI tools

### Community 72 - "4. Component catalog"
Cohesion: 0.40
Nodes (5): 4.1 sms, Tier A (*Verified* that each file exists; props from exploration), 4.2 sms, Tier B (adapt before use), 4.3 sms, Tier C (do not copy), 4.4 lss-v3 components that sms does not have (*Reported*), 4. Component catalog

### Community 73 - "5. Data layer boilerplate"
Cohesion: 0.40
Nodes (5): 5.1 `client.ts`, 5.2 `http.ts`: `createCrudResource<T, TInput>({ baseUrl })`, 5.3 Types: `types/reusable/pagination.ts`, 5.4 A concrete service is three lines, 5. Data layer boilerplate

### Community 74 - "TestCase"
Cohesion: 0.40
Nodes (3): Illuminate\Foundation\Testing\RefreshDatabase, Illuminate\Foundation\Testing\TestCase, TestCase

### Community 75 - "FBS Serve"
Cohesion: 0.40
Nodes (4): FBS Serve, Layout, Notes, Run it

### Community 76 - "admin/mock.ts"
Cohesion: 0.40
Nodes (3): admin, SettingsList, SettingsRow

### Community 80 - "ui.ts"
Cohesion: 0.40
Nodes (3): Notif, UiState, useUi

### Community 82 - "TablesPage.tsx"
Cohesion: 0.50
Nodes (3): RESERVED, tableShape(), TablesPage()

### Community 83 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 85 - "FBS Serve"
Cohesion: 0.50
Nodes (3): Backend preparation, FBS Serve, Rules

### Community 86 - "6. Backend CRUD boilerplate"
Cohesion: 0.50
Nodes (4): 6.1 Route macro: `Route::crudModule($prefix, Controller::class, $name)`, 6.2 `BaseController` (`app/Http/Controllers/v1/BaseController.php`), 6.3 Reference pair (copy these, not the screens that diverge), 6. Backend CRUD boilerplate

### Community 87 - "9. Conventions"
Cohesion: 0.50
Nodes (4): 9.1 Tailwind v4 tokens (`resources/css/app.css`, no `tailwind.config`), 9.2 Styling rules, 9.3 Loading, toasts, confirms, a11y, 9. Conventions

### Community 89 - "catalog/http.ts"
Cohesion: 0.50
Nodes (3): catalogHttp, categoriesApi, foodsApi

### Community 99 - "ModalHost.tsx"
Cohesion: 0.67
Nodes (3): ICON_RULES, ModalHost(), modalIcon()

### Community 105 - "autoload-dev"
Cohesion: 0.67
Nodes (3): autoload-dev, psr-4, Tests\\

### Community 106 - "extra"
Cohesion: 0.67
Nodes (3): extra, laravel, dont-discover

### Community 107 - "keywords"
Cohesion: 0.67
Nodes (3): keywords, framework, laravel

## Knowledge Gaps
- **349 isolated node(s):** `$schema`, `name`, `type`, `description`, `laravel` (+344 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BaseController` connect `Illuminate\Http\Request` to `api.php`, `DiscountController.php`, `Illuminate\Database\Eloquent\Model`, `Illuminate\Http\Resources\Json\JsonResource`, `PaymentMethodController`, `FloorController`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `TableSession` connect `Illuminate\Database\Eloquent\Relations\BelongsTo` to `Illuminate\Http\Request`, `Illuminate\Database\Eloquent\Model`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `DiningTable` connect `DiningTable` to `Illuminate\Http\Request`, `PaymentMethod`, `Illuminate\Database\Eloquent\Model`, `Illuminate\Database\Eloquent\Relations\BelongsTo`, `Food`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `$schema`, `name`, `type` to the rest of the system?**
  _349 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Illuminate\Http\Request` be split into smaller, more focused modules?**
  _Cohesion score 0.06497849976110846 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Illuminate\Database\Migrations\Migration` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._