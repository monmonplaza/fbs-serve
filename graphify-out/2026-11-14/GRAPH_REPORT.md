# Graph Report - fbs-serve-github  (2026-11-10)

## Corpus Check
- 243 files · ~124,584 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1450 nodes · 2214 edges · 183 communities (130 shown, 53 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de62e852`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Illuminate\Http\JsonResponse
- devDependencies
- Illuminate\Database\Migrations\Migration
- restaurant.ts
- scripts
- reservationHelpers.ts
- User
- useApi.ts
- compilerOptions
- Food
- What the prompt applies
- bootstrap/app.php
- FBS Serve — Handoff
- reservationActions.tsx
- RestaurantSeeder
- BaseController
- FoodController
- compilerOptions
- constants.ts
- domain.ts
- core.ts
- ResolvedLayout.tsx
- PayModals.tsx
- Illuminate\Database\Eloquent\Model
- require
- Illuminate\Database\Eloquent\Relations\HasMany
- Reusable Component Boilerplate Report
- seed.ts
- reservations.ts
- DiningTable
- require-dev
- seedData.ts
- Lightbox.tsx
- ordersColumns.ts
- ordersHelpers.tsx
- index.ts
- settingsConfig.tsx
- AppServiceProvider.php
- autoload-dev
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
- extra
- Reservation
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
- Order
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
- Illuminate\Http\Resources\Json\JsonResource
- DiscountController
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
- StoredFile
- guestLink.ts
- image.ts
- vite-env.d.ts
- UserController
- CategoryController
- TableSession.php
- Illuminate\Http\Request
- api.php
- uploads/mock.ts
- uploads/http.ts
- reservations/http.ts
- salesStats.ts
- ApiException
- Illuminate\Database\Eloquent\Relations\BelongsTo
- Ingredient
- FoodPicker.tsx
- SalesCharts.tsx
- Illuminate\Database\Seeder
- RoleController
- GuestController
- inventory/mock.ts
- IngredientModals.tsx
- HandlesFileUploads.php
- InventoryPage.tsx
- RecipeModal.tsx
- inventory/http.ts

## God Nodes (most connected - your core abstractions)
1. `BaseController` - 56 edges
2. `DiningTable` - 30 edges
3. `Food` - 29 edges
4. `OrderService` - 26 edges
5. `Order` - 23 edges
6. `StoredFile` - 23 edges
7. `TableController` - 20 edges
8. `OrderRound` - 20 edges
9. `Reservation` - 20 edges
10. `User` - 20 edges

## Surprising Connections (you probably didn't know these)
- `booking()` --calls--> `DiningTable`  [EXTRACTED]
  tests/Feature/StaffAndReservationsTest.php → app/Models/DiningTable.php
- `sendFor()` --calls--> `Food`  [EXTRACTED]
  tests/Feature/InventoryTest.php → app/Models/Food.php
- `add()` --calls--> `Food`  [EXTRACTED]
  tests/Support/OrderingHelpers.php → app/Models/Food.php
- `BaseController` --inherits--> `Controller`  [EXTRACTED]
  app/Http/Controllers/v1/BaseController.php → app/Http/Controllers/Controller.php
- `GuestController` --inherits--> `BaseController`  [EXTRACTED]
  app/Http/Controllers/Public/GuestController.php → app/Http/Controllers/v1/BaseController.php

## Import Cycles
- None detected.

## Communities (183 total, 53 thin omitted)

### Community 0 - "Illuminate\Http\JsonResponse"
Cohesion: 0.17
Nodes (6): KitchenController, OrderController, OrderRound, OrderService, Illuminate\Http\JsonResponse, Illuminate\Support\Collection

### Community 1 - "devDependencies"
Cohesion: 0.04
Nodes (44): axios, @inertiajs/react, @inertiajs/vite, laravel-vite-plugin, dependencies, axios, @inertiajs/react, qrcode-generator (+36 more)

### Community 2 - "Illuminate\Database\Migrations\Migration"
Cohesion: 0.07
Nodes (3): Illuminate\Database\Migrations\Migration, Illuminate\Database\Schema\Blueprint, Illuminate\Support\Facades\Schema

### Community 3 - "restaurant.ts"
Cohesion: 0.06
Nodes (31): AppliedDiscount, AppSettings, Category, Database, DiningTable, Discount, Floor, Food (+23 more)

### Community 4 - "scripts"
Cohesion: 0.08
Nodes (26): scripts, dev, post-autoload-dump, post-create-project-cmd, post-root-package-install, post-update-cmd, pre-package-uninstall, setup (+18 more)

### Community 5 - "reservationHelpers.ts"
Cohesion: 0.13
Nodes (15): addDays(), draftKey(), DraftStore, hm(), initDraft(), OrderDraft, pad2(), ResDraft (+7 more)

### Community 6 - "User"
Cohesion: 0.15
Nodes (10): User, UserFactory, Illuminate\Database\Eloquent\Attributes\Fillable, Illuminate\Database\Eloquent\Attributes\Hidden, Illuminate\Database\Eloquent\Factories\Factory, Illuminate\Database\Eloquent\Factories\HasFactory, Illuminate\Foundation\Auth\User, Illuminate\Notifications\Notifiable (+2 more)

### Community 7 - "useApi.ts"
Cohesion: 0.09
Nodes (4): clientRef, EMPTY, KeyName, keys

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, resources/js, compilerOptions, baseUrl, isolatedModules, jsx, lib (+11 more)

### Community 9 - "Food"
Cohesion: 0.21
Nodes (4): Food, booking(), add(), url()

### Community 10 - "What the prompt applies"
Cohesion: 0.18
Nodes (10): 1. Package, 2. `.env`, 3. `config/filesystems.php` — the `s3` disk, 4. Upload trait — `app/Traits/HandlesFileUploads.php`, 5. Clear config, DigitalOcean Spaces uploads for a Laravel project, Left out (copy from `laravel-sub-sms` `app/Traits/HandlesFileUploads.php` if needed), Prompt to give Claude in the other project (+2 more)

### Community 11 - "bootstrap/app.php"
Cohesion: 0.13
Nodes (11): DevOpen, HandleInertiaRequests, Closure, Illuminate\Database\Eloquent\ModelNotFoundException, Illuminate\Foundation\Application, Illuminate\Foundation\Configuration\Exceptions, Illuminate\Foundation\Configuration\Middleware, Illuminate\Validation\ValidationException (+3 more)

### Community 12 - "FBS Serve — Handoff"
Cohesion: 0.11
Nodes (17): Code map (`index.html`), Design rules, FBS Serve — Handoff, Files, Modules, Not done yet / known limits, Notifications, Orders: one bill per table (+9 more)

### Community 13 - "reservationActions.tsx"
Cohesion: 0.20
Nodes (14): attempt(), markNoShow(), moveToDay(), openCancel(), openDelete(), openMove(), openRes(), openResForm() (+6 more)

### Community 14 - "RestaurantSeeder"
Cohesion: 0.31
Nodes (3): RestaurantSeeder, Illuminate\Http\UploadedFile, Illuminate\Support\Facades\Storage

### Community 17 - "compilerOptions"
Cohesion: 0.13
Nodes (14): node, vite.config.ts, compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck (+6 more)

### Community 18 - "constants.ts"
Cohesion: 0.13
Nodes (15): GSTEP_L, GSTEPS, KITCHEN, NAV, OrderStatusMeta, OSTAT, StatusMeta, TAGS (+7 more)

### Community 19 - "domain.ts"
Cohesion: 0.24
Nodes (10): billKey(), hasV(), isTO(), itemName(), oMeta(), plateItems(), subtotal(), total() (+2 more)

### Community 20 - "core.ts"
Cohesion: 0.21
Nodes (7): ApiError, fail(), newTakeout(), nextId(), nextPickup(), sessionOrders(), syncTable()

### Community 21 - "ResolvedLayout.tsx"
Cohesion: 0.22
Nodes (6): AppProviders(), client, AppShell(), isBare(), ResolvedLayout(), withResolvedLayout()

### Community 22 - "PayModals.tsx"
Cohesion: 0.28
Nodes (10): fail(), HandoverModal(), isPayable(), openOrder(), openPickup(), OrderModal(), PayTableModal(), PickupModal() (+2 more)

### Community 23 - "Illuminate\Database\Eloquent\Model"
Cohesion: 0.10
Nodes (9): FloorController, Floor, FoodPhoto, FoodVariant, OrderItem, OrderPayment, ReservationHistory, ReservationItem (+1 more)

### Community 24 - "require"
Cohesion: 0.15
Nodes (13): require, ext-bcmath, ext-curl, ext-fileinfo, ext-mbstring, ext-openssl, ext-pdo_sqlite, inertiajs/inertia-laravel (+5 more)

### Community 26 - "Illuminate\Database\Eloquent\Relations\HasMany"
Cohesion: 0.13
Nodes (4): Category, PaymentMethod, Role, Illuminate\Database\Eloquent\Relations\HasMany

### Community 27 - "Reusable Component Boilerplate Report"
Cohesion: 0.18
Nodes (10): 14. Gaps and next steps, 15. Team onboarding checklist, 1. How to use this document, 2. Stack baseline, 3. Portability tiers, 8.1 React (recommended), 8.2 Server side (emails, PDFs), optional, 8. Markdown rendering boilerplate (+2 more)

### Community 28 - "seed.ts"
Cohesion: 0.33
Nodes (9): createDatabase(), nextId(), nextPickup(), PHOTO_COLORS, rng(), samplePhoto(), seedOrders(), seedReservations() (+1 more)

### Community 29 - "reservations.ts"
Cohesion: 0.20
Nodes (7): REMIND_AFTER, REMIND_BEFORE, RES_MIN, resLive(), resProblem(), SHOW_AFTER, SHOW_BEFORE

### Community 30 - "DiningTable"
Cohesion: 0.15
Nodes (4): TableController, DiningTable, TableSession, TableSync

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
Cohesion: 0.25
Nodes (3): CHAN, chanOf(), ChTag()

### Community 37 - "index.ts"
Cohesion: 0.17
Nodes (10): admin, api, catalog, guest, inventory, kitchen, orders, reservations (+2 more)

### Community 38 - "settingsConfig.tsx"
Cohesion: 0.22
Nodes (6): Cfg, Field, Opts, Row, SET, TAB_ORDER

### Community 39 - "AppServiceProvider.php"
Cohesion: 0.22
Nodes (5): AppServiceProvider, Illuminate\Cache\RateLimiting\Limit, Illuminate\Support\Facades\RateLimiter, Illuminate\Support\Facades\Route, Illuminate\Support\ServiceProvider

### Community 40 - "autoload-dev"
Cohesion: 0.67
Nodes (3): autoload-dev, psr-4, Tests\\

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

### Community 52 - "extra"
Cohesion: 0.67
Nodes (3): extra, laravel, dont-discover

### Community 53 - "Reservation"
Cohesion: 0.19
Nodes (4): ReservationController, Reservation, Carbon, Carbon\Carbon

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
Cohesion: 0.29
Nodes (5): admin, mockPasswords, ProfileInput, SettingsList, SettingsRow

### Community 80 - "ui.ts"
Cohesion: 0.40
Nodes (3): Notif, UiState, useUi

### Community 82 - "TablesPage.tsx"
Cohesion: 0.50
Nodes (3): RESERVED, tableShape(), TablesPage()

### Community 83 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 84 - "Order"
Cohesion: 0.11
Nodes (4): Discount, Order, Money, self

### Community 85 - "FBS Serve"
Cohesion: 0.40
Nodes (4): Backend preparation, FBS Serve, graphify, Rules

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

### Community 102 - "print.ts"
Cohesion: 0.33
Nodes (3): PrintJob, usePrint, useQrPrint

### Community 105 - "Illuminate\Http\Resources\Json\JsonResource"
Cohesion: 0.10
Nodes (8): CategoryResource, DiscountResource, FloorResource, PlateLineResource, ReservationResource, RoleResource, TableResource, Illuminate\Http\Resources\Json\JsonResource

### Community 107 - "keywords"
Cohesion: 0.67
Nodes (3): keywords, framework, laravel

### Community 135 - "StoredFile"
Cohesion: 0.13
Nodes (5): PaymentMethodController, FoodResource, PaymentMethodResource, UserResource, StoredFile

### Community 141 - "guestLink.ts"
Cohesion: 0.31
Nodes (7): appUrlIsLocal(), guestLink(), keyName(), publicBase(), savedKey(), saveKey(), takeoutLink()

### Community 142 - "image.ts"
Cohesion: 0.83
Nodes (3): blobToDataUrl(), imageToDataUrl(), scaleImage()

### Community 157 - "TableSession.php"
Cohesion: 0.20
Nodes (3): Illuminate\Database\Eloquent\Relations\HasOne, Illuminate\Support\Str, Pdo\Mysql

### Community 159 - "Illuminate\Http\Request"
Cohesion: 0.21
Nodes (4): IngredientController, IngredientResource, StockService, Illuminate\Http\Request

### Community 160 - "api.php"
Cohesion: 0.19
Nodes (6): Controller, UploadController, SettingsController, ProfileController, AppSetting, Illuminate\Validation\Rule

### Community 165 - "salesStats.ts"
Cohesion: 0.19
Nodes (5): addDays(), hourly(), HourSales, salesOn(), saleTime()

### Community 166 - "ApiException"
Cohesion: 0.21
Nodes (6): ApiException, OrderRoundResource, Settlement, Illuminate\Support\Facades\DB, Illuminate\Support\Facades\Validator, RuntimeException

### Community 168 - "Ingredient"
Cohesion: 0.18
Nodes (3): Ingredient, StockMovement, sendFor()

### Community 171 - "SalesCharts.tsx"
Cohesion: 0.29
Nodes (5): CompareChart(), DaySalesChart(), longDay(), useWidth(), ymd()

### Community 177 - "inventory/mock.ts"
Cohesion: 0.33
Nodes (8): find(), IngredientInput, inventory, isLow(), move(), round3(), state, useStockForOrder()

### Community 178 - "IngredientModals.tsx"
Cohesion: 0.29
Nodes (4): ACTIONS, qtyText(), StockAction, StockActionForm()

## Knowledge Gaps
- **385 isolated node(s):** `$schema`, `name`, `type`, `description`, `laravel` (+380 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BaseController` connect `BaseController` to `api.php`, `Illuminate\Http\JsonResponse`, `ApiException`, `StoredFile`, `Illuminate\Http\Resources\Json\JsonResource`, `DiscountController`, `RoleController`, `GuestController`, `FoodController`, `Reservation`, `Illuminate\Database\Eloquent\Model`, `UserController`, `CategoryController`, `DiningTable`, `Illuminate\Http\Request`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `User` connect `User` to `api.php`, `Illuminate\Database\Eloquent\Relations\BelongsTo`, `StoredFile`, `Food`, `RestaurantSeeder`, `Illuminate\Database\Eloquent\Relations\HasMany`, `UserController`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `Food` connect `Food` to `Illuminate\Http\JsonResponse`, `ApiException`, `StoredFile`, `Ingredient`, `RestaurantSeeder`, `GuestController`, `Order`, `Illuminate\Database\Eloquent\Model`, `Illuminate\Database\Eloquent\Relations\HasMany`, `Illuminate\Http\Request`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `$schema`, `name`, `type` to the rest of the system?**
  _385 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Illuminate\Database\Migrations\Migration` be split into smaller, more focused modules?**
  _Cohesion score 0.06648936170212766 - nodes in this community are weakly interconnected._
- **Should `restaurant.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._