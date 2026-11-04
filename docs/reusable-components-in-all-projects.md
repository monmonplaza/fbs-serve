# Reusable Component Boilerplate Report

Laravel 13 + Inertia 3 + React 19 + Tailwind 4. Catalog of the reusable building blocks in this repo (`laravel-sub-sms`, "sms") and its sister project (`laravel-lss-v3`, "lss-v3"), plus the deployment, database-naming and PHP-environment conventions a team needs to start a new project from them.

- **Date:** 2026-10-05
- **Scope:** documentation only. Nothing in the app was changed to produce this report.
- **Evidence labels:** *Verified* = read directly in this repo. *Reported* = gathered from the lss-v3 project by exploration; paths are relative to `laravel-lss-v3/` and were not re-verified line by line.
- **Assumption:** "generic PHP plugin" in the request is read as **PHP extensions plus a pinned PHP version** (section 12). If IDE plugins were meant, add a short IDE-plugin list there instead.

## Contents

1. [How to use this document](#1-how-to-use-this-document)
2. [Stack baseline](#2-stack-baseline)
3. [Portability tiers](#3-portability-tiers)
4. [Component catalog](#4-component-catalog)
5. [Data layer boilerplate](#5-data-layer-boilerplate)
6. [Backend CRUD boilerplate](#6-backend-crud-boilerplate)
7. [New CRUD module template](#7-new-crud-module-template)
8. [Markdown rendering boilerplate](#8-markdown-rendering-boilerplate)
9. [Conventions](#9-conventions)
10. [Deployment: Octane / FrankenPHP / Coolify](#10-deployment-octane--frankenphp--coolify)
11. [Table prefix convention `app_`](#11-table-prefix-convention-app_)
12. [PHP extensions and environment parity](#12-php-extensions-and-environment-parity)
13. [Do not copy: known defects](#13-do-not-copy-known-defects)
14. [Gaps and next steps](#14-gaps-and-next-steps)
15. [Team onboarding checklist](#15-team-onboarding-checklist)
16. [Using this document with Claude and other AI tools](#16-using-this-document-with-claude-and-other-ai-tools)

---

## 1. How to use this document

1. Pick the tier (section 3) you can accept. Tier A files copy as-is.
2. Copy the component **and** the Tailwind tokens it relies on (section 9). A copied component without `--color-brand-*`, `--color-neutral-*`, `--shadow-card`, `--shadow-popover` and the `animate-*` keyframes renders unstyled.
3. Fix import aliases (`@/*` maps to `resources/js/*`).
4. For a new CRUD screen, follow section 7. Do not hand-write a list/form page from scratch.
5. Check section 13 before copying anything: some files in both repos are dead or broken.

---

## 2. Stack baseline

| Area | sms (*Verified*) | lss-v3 (*Reported*) |
|---|---|---|
| PHP / Laravel | `^8.4.1`, Laravel 13 | `^8.4.1`, Laravel 13.23 |
| Inertia | `@inertiajs/react ^3` | inertia-laravel 3.2, React adapter 3.6 |
| React | 19.2 | 19.2 with React Compiler babel plugin |
| Tailwind | 4.3, tokens in `@theme` in `resources/css/app.css` | 4.3, same approach |
| Data fetching | TanStack Query 5 + axios | TanStack Query 5 + axios |
| Forms | none; hand-built `FormField` + local state | Formik 2 + Yup |
| Toasts | custom `ToastContext` | custom `Toast.tsx` (sonner installed but unused) |
| Skeletons | `boneyard-js` generated bones | `boneyard-js` generated bones |
| Icons | `lucide-react` | `lucide-react` |
| Animation | `framer-motion` | none reported |
| Lint / types | `oxlint`, `tsc` ~6.0 | ESLint 9 flat + Prettier, `tsc` 5.9 |
| Backend tests | Pest | Pest 4 + Larastan level 7 + Pint |
| E2E | one Cypress spec | Cypress 15, two specs |
| Server | Octane on FrankenPHP | Octane on FrankenPHP |
| Production DB | PostgreSQL 17 + Redis | SQLite (dev) / PostgreSQL (prod per README) |

Both share the same CRUD backbone: `BaseController`, `Route::crudModule`, `createCrudResource`, the `{ success, message, data }` envelope and archive-then-delete lifecycle. Sections 5 and 6 document it once.

---

## 3. Portability tiers

| Tier | Meaning | Examples |
|---|---|---|
| **A** | Copy as-is. No app-specific imports. | `Button`, `Modal`, `Select`, `DatePicker`, `StatCard`, `ActionMenu`, `AppSkeleton`, `client.ts`, `http.ts` |
| **B** | Copy and adapt a small coupling. | `CardGridPanel` (localStorage key prefix `fca:`), `SubTabs` (uses `useModuleAccess`), `StatusBadge` (hard-coded school status map), print shell (imports `Logo`) |
| **C** | Domain-specific. Do not copy. | `Sidebar`, `TopBar`, `Logo`, role shells, `accounting/*`, `admission/*`, `agent/*`, `platform/ui.tsx` |

---

## 4. Component catalog

All paths are under `resources/js/`. All components use Tailwind classes and `lucide-react` icons.

### 4.1 sms, Tier A (*Verified* that each file exists; props from exploration)

| Component | Path | Props / behavior | Extra deps |
|---|---|---|---|
| `Button` | `components/Button.tsx` | `variant: primary \| secondary \| ghost \| danger`, `size: sm \| md \| lg`, `loading`, `icon`, `fullWidth`. `loading` shows a spinner and disables. | none |
| `FormField` | `components/FormField.tsx` | Input attributes plus `label`, `error`, `hint`, `endAdornment`. `type="date"` delegates to `DatePicker`. | `DatePicker` |
| `Select` | `components/Select.tsx` | `value`, `onChange(v)`, `options: (string \| {value,label?,description?,icon?})[]`, `label`, `placeholder`, `error`, `hint`, `size`, `disabled`, `searchable`. Portaled listbox, keyboard support, flips near viewport edge. | react-dom portal |
| `DatePicker` | `components/DatePicker.tsx` | `value` (`YYYY-MM-DD`), `onChange`, `label`, `min`, `max`, `error`, `hint`, `size`. MM/DD/YYYY mask plus calendar popover. | portal |
| `MultiSelect` | `components/staff/MultiSelect.tsx` | `values: string[]`, `onChange`, `options: string[]`, `label`, `placeholder`, `hint`. Lives in `staff/` but is generic. | portal |
| `StatCard` | `components/StatCard.tsx` | `label`, `value`, `icon`, `trend?`, `tone`, `hint`. | none |
| `TabGlide` | `components/TabGlide.tsx` | `layoutId`, `className`. Sliding active-tab indicator; `layoutId` must be unique per tab group. | framer-motion |
| `InstantTooltip` | `components/InstantTooltip.tsx` | `label`, `children`, `delay`. Portaled, flips, clamps to viewport. | portal |
| `InlineEditableField` | `components/InlineEditableField.tsx` | `label`, `value`, `type: text \| textarea \| date \| select`, `options`, `onSave(v): Promise<void>`. Enter saves, Esc cancels, API field error shown inline. | `Select`, `DatePicker`, `ApiError` |
| `FetchingSpinner` | `components/spinners/FetchingSpinner.tsx` | No props. Corner "Refreshing" indicator for background refetch; place in a `relative` container. | none |
| `AppSkeleton` | `components/skeletons/AppSkeleton.tsx` | `{ name, loading, children, className?, fill?, snapshotConfig? }` plus `useSkeletonData(loading, data, fixture)`, `fixtureRows(make, count)`, `isSkeletonCapture()`. | boneyard-js, generated `bones/*.bones.json` |
| `Modal` | `components/settings/Modal.tsx` | `open`, `onClose`, `title`, `description?`, `children`, `footer?`, `size: sm \| md \| lg \| xl`, `hideHeader?`. Esc and backdrop close, body scroll lock. | none |
| `ConfirmDialog` | `components/settings/ConfirmDialog.tsx` | `state: ConfirmState \| null`, `onClose`. `ConfirmState = { title, description, tone: danger \| warning \| info \| success, confirmLabel?, cancelLabel?, requireTypedConfirmation?, onConfirm }`. Pair with `useConfirm`. | `Modal`, `Button` |
| `useConfirm` | `hooks/useConfirm.ts` | Returns `{ confirmState, confirm(opts), closeConfirm }`. | none |
| `ActionMenu` | `components/settings/ActionMenu.tsx` | `items: { label, icon, onClick, danger? }[]`. Kebab menu in a portal. | portal |
| `Toggle` | `components/settings/Toggle.tsx` | `checked`, `onChange`, `label?`, `description?`, `disabled?`. `role="switch"`. | none |
| `TableToolbar` | `components/settings/TableToolbar.tsx` | `searchValue`, `onSearchChange`, `filters?`, `actions?`, `onClearFilters?`. Also exports `ToolbarSelect`, `ToolbarDateRange`. | `DatePicker`, `Button` |
| `CardGridPanel` kit | `components/settings/CardGridPanel.tsx` | `PanelHeader`, `TotalRecordsChip`, `useViewMode(pageKey)`, `ViewToggle`, `useSort`, `sortParams`, `Th`, `ListTable`, `listRowClass`, `RowTitle`, `StopRowClick`, `QuickFilterChips`, `StatusPill`, `cardClass`, `InlineEdit`, `GridEmptyState`, `GridFooter`. The whole list-page kit. | `PaginationBar`, `Select` |
| `PaginationBar` | `components/table/components/Pagination.tsx` | `{ meta, page, loading, onPageChange }`, plus `PageNumbers`, `PageBtn`. | none |
| `SectionCard` | `components/dashboard/SectionCard.tsx` | `icon?`, `title`, `trailing?`, `skeletonName?`, `loading?`, `variant: light \| dark`, `viewAllHref?`, `children`. | `AppSkeleton` |
| `SegmentedControl<T>` | `components/dashboard/SegmentedControl.tsx` | `options`, `value`, `onChange`, `layoutId`, `size`. ARIA tablist, arrow keys. | framer-motion |
| `PersonAvatar` | `components/dashboard/PersonAvatar.tsx` | `name`, `size`. Initials avatar, color derived from name. | none |
| `MetricRing`, `Sparkline` | `components/dashboard/` | `MetricRing({ value, label, tone, size })`, `Sparkline({ data, tone, width, height })`. | framer-motion |
| `AttentionBanner` | `components/dashboard/AttentionBanner.tsx` | `icon`, `title`, `description`, `actionLabel?`, `href?`, `onAction?`, `tone`. | `router-compat` |
| `ToastProvider` / `useToast` | `context/ToastContext.tsx` | `showToast(message, { description?, tone: success \| error \| info })`. Pauses on hover, progress bar, `role="alert"` on errors. Throws outside the provider. | custom keyframes in `app.css` |
| `FlashToastBridge` | `components/FlashToastBridge.tsx` | No props. Turns Inertia shared `flash.{success,error,info}` into toasts. | `useToast`, Inertia |

### 4.2 sms, Tier B (adapt before use)

| Component | Path | What to change |
|---|---|---|
| `SubTabs` | `components/settings/SubTabs.tsx` | Hides coming-soon paths through `useModuleAccess`. Remove that hook for a plain tab bar. |
| `StatusBadge` | `components/StatusBadge.tsx` | Pattern is generic (case-insensitive tone lookup). The ~90-key map is school content; replace it. |
| `CardGridPanel` | `components/settings/CardGridPanel.tsx` | `useViewMode` stores `fca:view-mode:<pageKey>`; change the prefix. |
| `PrintForm` shell | `components/print/PrintForm.tsx` | Letterhead imports `Logo` (school branding). |
| `SettingsSummaryTable` | `components/settings/SettingsSummaryTable.tsx` | Row shape is tied to settings summary. |

### 4.3 sms, Tier C (do not copy)

`Sidebar`, `SidebarFooter`, `TopBar`, `Logo`, `GlobalSearchModal`, `accounting/*`, `registrar/*`, `student/*`, `teacher/*`, `parent/*`, `platform/*` (its own mini kit and a second, different `StatCard`), `admission/*`, `agent/*`, `attendance/*`, `announcements/*`, `parents-students/*`, the school-specific `dashboard/*` cards.

### 4.4 lss-v3 components that sms does not have (*Reported*)

Strongest template candidates, in `laravel-lss-v3/resources/js/`:

| Component | Path | Purpose |
|---|---|---|
| `FormModal<T>` | `components/form-modal/` | Config-driven create/edit modal on Formik + Yup + TanStack `useMutation`. Props include `fields: FieldDef[]`, `mode`, `row`, `mutationFn`, `invalidateKeys`, `onSuccess`, `layout: center \| side`. Helpers: `buildYupSchema`, `buildInitialValues`, `buildPayload`, `mapApiErrorsToFormik`. |
| `DataTableCardField<T>` | `components/table/DataTableCardField.tsx` | Server/client pagination, debounced search, column and status filters, table/card toggle, bulk and cross-page actions, in-use guard before delete. Hooks: `useCardTableController`, `useRecordRowActions`, `useTableQuery`. |
| `ModalCenter<T>`, `ModalSide<T>` | `components/modal/` | Modal shells: `show`, `onClose`, `data`, `size`, `title`, `ModalComponent`. |
| `ConfirmDeleteModal` | `components/modal/` | Type-to-confirm delete guard. Siblings: `ConfirmInUseModal`, `AttachmentViewerModal`. |
| `GlobalModalProvider`, `useGlobalModal<T>(key, default)` | `components/global-modal/` | Per-key `useSyncExternalStore` modal store, SSR-safe. |
| `AsyncSelectField` | `hooks/` | Remote-search select: `loadOptions`, `initialLabel`, `debounceMs`, `minSearchLength`; menu in a body portal. See `docs/async-select.md` there. |
| `use-file-upload-field` | `hooks/` | Single/multiple file field with drag-and-drop and thumbnails. |
| `ImageLightbox`, `AvatarCropModal`, `Thumbnail`, `Avatar` | `components/` | Image preview, crop (react-easy-crop), safe thumbnail. |
| `RowMenu`, `TooltipIconButton` | `components/` | Row kebab that flips upward near bottom; icon button with tooltip. |
| `spinners/*` | `components/spinners/` | `ButtonSpinner`, `ScreenSpinner`, `TableLoading`, `SkeletonLoader`. Older than the boneyard approach. |

`FormModal` and `DataTableCardField` are the two worth porting into sms if forms and a full data table are needed. Port them with their `types/reusable/{fields,data-table}.ts` files, which sms is missing (see section 13).

---

## 5. Data layer boilerplate

*Verified* in sms `resources/js/api-service/`.

### 5.1 `client.ts`

- `class ApiError extends Error { status: number; errors?: Record<string, string[]> }`
- `interface ApiEnvelope<T> { success?: boolean; message?: string; data: T }`
- `http`: one axios instance, `baseURL: ''`, `withCredentials: true`. Request interceptor sets `Accept: application/json`, `X-Requested-With`, and the CSRF header (`X-XSRF-TOKEN` from the cookie, else `X-CSRF-TOKEN` from `<meta name="csrf-token">`). Response interceptor turns every failure into `ApiError(body.message || error.message, status ?? 0, body.errors)`.
- `unwrap<T>(response)`: returns `null` for 204 or empty body; returns `body.data` if the body has a `data` key, else the bare body.

### 5.2 `http.ts`: `createCrudResource<T, TInput>({ baseUrl })`

| Method | HTTP | Notes |
|---|---|---|
| `getAll(params?)` | `GET /` | plain list |
| `getPaginatedFilterSearch(params?)` | `GET /pagination-search` | paginated, filtered, searched, sorted |
| `searchActive(params?)` | `GET /search-active` | active rows for pickers |
| `lookup(q?, params?)` | `GET /lookup?status=active&q=` | `{ value, label }[]` |
| `inUse(id)` | `GET /{id}/in-use` | relationship guard before delete |
| `create(data, opts?)` | `POST /` | `opts.onUploadProgress(percent)` |
| `update(id, data, opts?)` | `POST /{id}` | real POST, no `_method` spoofing, so uploads work |
| `archive(id)` / `restore(id)` | `PATCH /{id}/archive` / `/restore` | |
| `delete(id)` | `DELETE /{id}` | |

Payloads containing a `File` or `Blob` are auto-converted to `FormData` (`form-data.ts`: `hasBinaryFiles`, `buildFormData`, `buildQueryString` with bracketed keys such as `filters[status]=x`).

### 5.3 Types: `types/reusable/pagination.ts`

`CrudQueryParams { search?, filters?, sort_by?, sort_dir?, per_page?, page? }`, `PaginationMeta { current_page, last_page, per_page, total, from, to }`, `PaginatedResponse<T> { data, meta, links, filterable?, searchable?, filters?, search?, sort_by?, sort_dir? }`.

### 5.4 A concrete service is three lines

```ts
// api-service/academics/room.ts (sms)
export const roomService = createCrudResource<RoomRecord, RoomInput>({
    baseUrl: '/settings/academic/room',
});
```

lss-v3 has the same factory (`api-service-layer/http.ts`) plus a `use-crud.ts` hook (517 lines) that wraps it in TanStack Query. Its `buildFormData` is duplicated there; keep one copy if you port it.

---

## 6. Backend CRUD boilerplate

*Verified* in sms.

### 6.1 Route macro: `Route::crudModule($prefix, Controller::class, $name)`

Defined in `app/Providers/AppServiceProvider.php`. Registers:

| Method | Path | Action |
|---|---|---|
| GET | `/` | `index` (Inertia shell) |
| GET | `/pagination-search` | `paginationSearch` |
| GET | `/search-active` | `searchActive` |
| GET | `/lookup` | `lookup` |
| GET | `/{id}/in-use` | `inUse` |
| POST | `/` | `store` |
| POST | `/{id}` | `update` (POST so file uploads work) |
| PATCH | `/{id}/archive` | `archive` |
| PATCH | `/{id}/restore` | `restore` |
| DELETE | `/{id}` | `destroy` |

**Rule:** register any custom `POST` route (for example `/bulk-transfer`) **before** `crudModule`, or `POST /{id}` captures it.

### 6.2 `BaseController` (`app/Http/Controllers/v1/BaseController.php`)

Configure a child controller with properties, not code:

| Property | Default | Purpose |
|---|---|---|
| `$model` | required | Eloquent model class |
| `$view` | required | Inertia page name for `index` |
| `$searchable` | `[]` | columns searched with `LIKE` |
| `$filterable` | `[]` | whitelist for `filters[col]` |
| `$exactFilters` | `['status']` | filters using `=` instead of `LIKE` |
| `$sortable` | `['id']` | whitelist for `sort_by` |
| `$resource` | `null` | `JsonResource` class for list output |
| `$activeColumns` | `['id','name']` | columns returned by `search-active` |
| `$sortBy` / `$sortDir` | `name` / `asc` | default sort |
| `$inUseRelations` | `[]` | relations that block delete while non-empty |
| `$requireInactiveBeforeDelete` | `true` | archive-first workflow |
| `$undeletableStatuses` | `['active']` | statuses that block delete |
| `$fileFields`, `$fileFieldFolders`, `$fileUrlExpiry` | | file upload handling (`HandlesFileUploads`) |

Override hooks as needed: `storeRules()`, `updateRules(Model $model)`, `validationMessages()`, `beforeSave($validated, ?$model)`, `afterCreate()`, `afterUpdate()`, `applySearch()`, `applySort()`, `newQuery()` (add eager loads and counts here).

Responses use the envelope `{ success, message, data }` (`sendResponse`) or `{ success: false, message, errors }` (`sendError`). `paginationSearch` returns `{ data, meta, links, filterable, searchable, filters, search, sort_by, sort_dir }`; `per_page` defaults to 10 and is clamped to 1..1000. `destroy` runs in a transaction with a row lock, applies the archive-first rule, then checks `$inUseRelations` and returns `errors.in_use: [{label, count}]` with 422.

### 6.3 Reference pair (copy these, not the screens that diverge)

| Layer | File |
|---|---|
| Controller | `app/Http/Controllers/v1/Academics/RoomController.php` |
| Policy | `app/Policies/RoomPolicy.php` |
| Resource | `app/Http/Resources/RoomResource.php` |
| Model | `app/Models/Room.php` |
| Migration | `database/migrations/*_create_rooms_table.php` |
| Service | `resources/js/api-service/academics/room.ts` |
| Page | `resources/js/pages/settings/academic/RoomPage.tsx` (599 lines; a template, not a drop-in) |
| Test pattern | `tests/Feature/SubjectTest.php`; isolation in `tests/Feature/MultiSchool/IsolationTest.php` |

lss-v3 has the same `BaseController` plus filters for dates, relations and JSON (`$dateFilters`, `$relationFilters`, `$jsonContainsFilters`, `$relationSortable`) and file helpers (*Reported*).

---

## 7. New CRUD module template

Order, matching the repo convention: **migration, model, policy, resource, controller, route, api-service, page, navigation.**

Placeholders: `{{Name}}` = `Widget`, `{{table}}` = `widgets`, `{{path}}` = `/settings/widgets`. Lines marked *multi-school* apply only to the multi-school app (sms); delete them in single-tenant projects. Table names use the `app_` convention from section 11; in sms keep plain names.

### 7.1 Migration

```php
Schema::create('app_{{table}}', function (Blueprint $table) {
    $table->id();
    // multi-school: $table->foreignId('school_id')->constrained()->restrictOnDelete();
    $table->string('name');
    $table->string('status', 20)->default('active');
    $table->timestamps();
    $table->unique(['name']); // multi-school: unique(['school_id', 'name'])
    // multi-school: add an index led by school_id (ScaleTest enforces it)
});
```

### 7.2 Model

```php
class {{Name}} extends Model
{
    // multi-school: use BelongsToSchool;  (school_id is never fillable)
    protected $table = 'app_{{table}}';
    protected $fillable = ['name', 'status'];
}
```

### 7.3 Policy and resource

```php
class {{Name}}Policy
{
    public function viewAny(User $actor): bool { return $actor->hasRole('Admin'); }
    public function view(User $actor, {{Name}} $m): bool { return $actor->hasRole('Admin'); }
    public function create(User $actor): bool { return $actor->hasRole('Admin'); }
    public function update(User $actor, {{Name}} $m): bool { return $actor->hasRole('Admin'); }
    public function archive(User $actor, {{Name}} $m): bool { return $actor->hasRole('Admin'); }
    public function restore(User $actor, {{Name}} $m): bool { return $actor->hasRole('Admin'); }
    public function delete(User $actor, {{Name}} $m): bool { return $actor->hasRole('Admin'); }
}

class {{Name}}Resource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'status' => $this->status,
                'created_at' => $this->created_at, 'updated_at' => $this->updated_at];
    }
}
```

### 7.4 Controller and route

```php
class {{Name}}Controller extends BaseController
{
    protected string $model = {{Name}}::class;
    protected string $view = 'settings/{{Name}}Page';
    protected array $searchable = ['name'];
    protected array $filterable = ['status'];
    protected array $sortable = ['id', 'name', 'status', 'created_at'];
    protected ?string $resource = {{Name}}Resource::class;

    protected function storeRules(): array
    {
        return ['name' => ['required', 'string', 'max:255', 'unique:app_{{table}},name']];
    }

    protected function updateRules(Model $model): array
    {
        return ['name' => ['required', 'string', 'max:255', Rule::unique('app_{{table}}', 'name')->ignore($model->id)]];
    }
}
```

```php
// routes/web.php, inside the role/permission group
Route::get('{{path}}', [{{Name}}Controller::class, 'index'])->name('settings.{{table}}');
Route::crudModule('{{path}}', {{Name}}Controller::class, 'settings.{{table}}');
```

### 7.5 Service

```ts
// resources/js/api-service/{{table}}.ts
export interface {{Name}}Record { id: number; name: string; status: 'active' | 'inactive'; created_at: string; updated_at: string }
export interface {{Name}}Input { name: string; status?: {{Name}}Record['status'] }
export const {{table}}Service = createCrudResource<{{Name}}Record, {{Name}}Input>({ baseUrl: '{{path}}' });
```

### 7.6 Page skeleton (list view only)

Compose the real building blocks. The full reference (grid and list views, sort, export, availability switch) is `RoomPage.tsx`.

```tsx
const FIXTURE: {{Name}}Record[] = fixtureRows((i) => ({ id: -i, name: `Sample ${i}`, status: 'active', created_at: '', updated_at: '' }), 3);

export default function {{Name}}Page() {
  const { showToast } = useToast();
  const { confirmState, confirm, closeConfirm } = useConfirm();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [sort, toggleSort] = useSort();
  const [editing, setEditing] = useState<{{Name}}Record | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const query = useQuery({
    queryKey: ['{{table}}', page, perPage, search, sort],
    queryFn: () => {{table}}Service.getPaginatedFilterSearch({ search, ...sortParams(sort), per_page: perPage, page }),
  });
  const rows = useSkeletonData(query.isLoading, query.data?.data ?? [], FIXTURE);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['{{table}}'] });

  const save = useMutation({
    mutationFn: (data: {{Name}}Input) => (editing ? {{table}}Service.update(editing.id, data) : {{table}}Service.create(data)),
    onSuccess: () => { invalidate(); showToast('Saved'); setFormOpen(false); },
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Unable to save.', { tone: 'error' }),
  });

  return (
    <>
      <PanelHeader icon={Boxes} title="{{Name}}s" actions={<Button icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add</Button>} />
      <TableToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search" />
      <AppSkeleton name="settings-{{table}}-table" loading={query.isLoading}>
        <ListTable minWidth={640} head={<tr><Th sortKey="name" sort={sort} onSort={toggleSort}>Name</Th><Th>Status</Th><Th /></tr>}>
          {rows.map((r) => (
            <tr key={r.id} className={listRowClass(r.status === 'inactive')}>
              <td><RowTitle icon={Boxes} title={r.name} archived={r.status === 'inactive'} /></td>
              <td><StatusPill tone={r.status === 'inactive' ? 'neutral' : 'green'} label={r.status} /></td>
              <td><StopRowClick><ActionMenu items={[/* Edit, Archive/Restore, Delete (archived only) */]} /></StopRowClick></td>
            </tr>
          ))}
        </ListTable>
      </AppSkeleton>
      {query.data && <GridFooter meta={query.data.meta} page={page} loading={query.isFetching} onPageChange={setPage} perPage={perPage} perPageOptions={[8, 12, 16, 24]} onPerPageChange={setPerPage} />}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit' : 'Add'}>{/* FormField inputs + Button calling save.mutate */}</Modal>
      <ConfirmDialog state={confirmState} onClose={closeConfirm} />
    </>
  );
}
```

Props above follow the signatures in `CardGridPanel.tsx`; check them against the file when you paste, since this is a skeleton, not generated code. After changing a wrapped region, run `npm run bones:build` (needs the app on :8000, Vite running, `BONEYARD_TOKEN` in `.env`).

### 7.7 Test skeleton (Pest)

```php
beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create();   // sms creates the user inline; use a factory if you have one
    $this->admin->assignRole('Admin');
});

it('creates, rejects duplicates, archives and deletes a {{Name}}', function () {
    $this->actingAs($this->admin)->postJson('{{path}}', ['name' => 'A'])->assertCreated();
    $this->actingAs($this->admin)->postJson('{{path}}', ['name' => 'A'])->assertUnprocessable()->assertJsonValidationErrors('name');
    $id = {{Name}}::first()->id;
    $this->actingAs($this->admin)->patchJson("{{path}}/{$id}/archive")->assertOk();
    $this->actingAs($this->admin)->deleteJson("{{path}}/{$id}")->assertNoContent();
});
```

Multi-school: also extend `tests/Feature/MultiSchool/IsolationTest.php` so the new table is checked for cross-school leakage.

---

## 8. Markdown rendering boilerplate

Neither repo renders markdown today: no `react-markdown`, `marked` or `remark` dependency, no `@tailwindcss/typography`, no `dangerouslySetInnerHTML` outside print and SVG code. This section is a **spec and sketch; nothing is installed**.

### 8.1 React (recommended)

`react-markdown` does not render raw HTML and filters unsafe link protocols by default, so no sanitizer is needed unless you opt into raw HTML. Add `rehype-sanitize` only if you also add `rehype-raw`.

```bash
npm install react-markdown remark-gfm @tailwindcss/typography
```

```css
/* resources/css/app.css */
@plugin "@tailwindcss/typography";
```

```tsx
// resources/js/components/Markdown.tsx
import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
    /** Markdown text. Raw HTML inside it is not rendered. */
    source: string;
    className?: string;
}

const components: ComponentProps<typeof ReactMarkdown>['components'] = {
    // `node` must not reach the DOM.
    a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

export function Markdown({ source, className = '' }: MarkdownProps) {
    return (
        <div className={`prose prose-sm max-w-none prose-a:text-brand-600 ${className}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {source}
            </ReactMarkdown>
        </div>
    );
}
```

Rules: never pass user markdown to `dangerouslySetInnerHTML`; keep links opening with `rel="noopener noreferrer"`; wrap the data region in `AppSkeleton` while loading, like every other data region (section 9).

### 8.2 Server side (emails, PDFs), optional

Laravel already ships `league/commonmark` and the `Str::markdown()` helper:

```php
Str::markdown($text, ['html_input' => 'strip', 'allow_unsafe_links' => false]);
```

Use `Str::markdown` for user-supplied text and `Str::inlineMarkdown` for single lines.

---

## 9. Conventions

*Verified* in sms unless noted.

### 9.1 Tailwind v4 tokens (`resources/css/app.css`, no `tailwind.config`)

| Group | Tokens |
|---|---|
| Brand / accent | `--color-brand-{50..900}`, `--color-gold-{50..800}` |
| Neutrals | `--color-ink`, `--color-neutral-{0,50..900}` |
| Semantic | `--color-{success,warning,danger,info}-{50,100,400,600,800}` |
| Fonts | `--font-sans`, `--font-display`, `--font-serif-display`, `--font-mono` |
| Type scale | `--text-xs` 12px, `sm` 13, `base` 14, `md` 15, `lg` 17, `xl` 19, `2xl` 23, `3xl` 29 |
| Radius | `--radius-{sm,md,lg,xl,pill}` = 6, 8, 10, 14, 999 px |
| Shadows | `--shadow-card`, `--shadow-popover`, `--shadow-modal` |
| Animations | `fade-in`, `scale-in`, `slide-down`, `slide-in-left`, `shake`, `glow`, `toast-*` |

In sms, `brand-*` and `gold-*` are overridden per school at runtime by `partials/school-theme.blade.php`; the values in `app.css` are fallbacks. For a single-tenant project, set them once in `@theme`.

### 9.2 Styling rules

- Controls: `h-11` (md) or `h-9` (sm), `rounded-md`, `border-neutral-200`, focus `ring-2 ring-brand-100` with `border-brand-500`.
- Cards: `rounded-lg border border-neutral-200 bg-white shadow-card`.
- Z-index: modals `z-50`, tooltips `z-[60]`, popovers `z-[100]` (portaled).
- Interactive elements carry `cursor-pointer` explicitly.
- Section titles: `font-display font-semibold text-ink`.
- Tone maps: `Record<tone, 'bg-X-50 text-X-600'>`.
- Helper classes: `fca-scrollbar`, `fca-table-scroll`, `fca-container`, `.no-print`, `.print-view-root`. Rename the `fca-` prefix per project.
- Global `prefers-reduced-motion` override and a 2px `:focus-visible` outline are already in the base layer.

### 9.3 Loading, toasts, confirms, a11y

- **Never** show an empty state while loading. Wrap the region in `AppSkeleton` (unique name `<module>-<page>-<region>`), feed fixture rows through `useSkeletonData`, mark real parts with `data-skeleton-keep`, then run `npm run bones:build` and commit `resources/js/bones/*`. The `.githooks/pre-commit` hook does this when a commit touches `resources/js/{pages,components,layouts}/*.tsx`.
- Feedback: `useToast().showToast`, not `alert`. Destructive actions: `useConfirm` + `ConfirmDialog`, never `window.confirm`.
- Accessibility: `role="switch"` on toggles, Esc closes modals and menus, arrow keys in tablists and listboxes, visible focus ring, `role="alert"` on error toasts.
- Navigation: there is no client router; `lib/router-compat.tsx` mirrors the react-router-dom API on top of Inertia. Keep using it.
- Inertia: never name a page prop `school`, `platform`, `auth` or `flash` (shared props are overridden). Rename for a non-school project.

---

## 10. Deployment: Octane / FrankenPHP / Coolify

### 10.1 Topology

| | sms (*Verified*) | lss-v3 (*Reported*) |
|---|---|---|
| Image | `dunglas/frankenphp:1-php8.4`, Octane (`--server=frankenphp`) | same base image |
| Services | `migrate` (one-off), `web-1`, `web-2`, `queue`, `scheduler`, `redis` | one `web` service only |
| Edge | Coolify's Traefik; the app writes route files (`app/Support/ProxyRoutes.php`) | Coolify |
| Migrations | one-off `migrate` service (`scripts/migrate.sh`), web containers run with `RUN_MIGRATIONS=false` | `deploy.sh` runs `migrate --force` + `db:seed` at every start |
| Queue | dedicated `queue` service (`scripts/worker.sh`) | `scheduled-queue-drain` closure in `bootstrap/app.php` (`queue:work --stop-when-empty --max-time=50`) driven by Coolify's scheduled `schedule:run` |
| Health | `/up`: DB + Redis + the `storage/framework/draining` flag | `/up` |
| Zero downtime | `deploy/rolling-deploy.sh`: build, run migrate, then for each web container touch the drain flag, wait, recreate, wait for healthy | none documented |
| CI to deploy | none (no `.github/`) | GitHub Actions `deploy.yml` calls a Coolify webhook after the `tests` workflow succeeds on `main`/`master` |
| Sizing | stack stays within 1 CPU and 2 GB by default (per-service caps) | `cpus: 1.5`, `mem_limit: 1536m` for one container |

Full single-VPS runbook for sms: `docs/deployment/coolify-single-vps.md`.

### 10.2 Dockerfile skeleton

```dockerfile
# Pin an exact FrankenPHP tag instead of the floating "1-php8.4".
FROM dunglas/frankenphp:<x.y.z>-php8.4

ENV PORT=8000 COMPOSER_ALLOW_SUPERUSER=1 LOG_STACK=single,stderr
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git unzip libpng-dev libonig-dev libxml2-dev libpq-dev zip curl \
    && install-php-extensions bcmath gd intl zip opcache pcntl redis pdo_pgsql pgsql \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer   # pin the major, not "latest"

# Dependencies first so Docker caches them (lss-v3 order).
COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-dev --no-scripts --no-autoloader
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN composer dump-autoload --optimize --no-dev && npm run build   # client + SSR bundles
RUN php artisan octane:install --server=frankenphp --no-interaction && chmod +x scripts/*.sh

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=3 CMD curl -fsS http://127.0.0.1:${PORT:-8000}/up || exit 1
CMD ["bash", "scripts/deploy.sh"]
```

Add only the extensions the app really uses (section 12). The sms image installs `pdo_mysql`, `intl` and `zip` with no direct use found in app code.

### 10.3 `scripts/deploy.sh` skeleton (web container start)

Abridged from sms:

```bash
#!/usr/bin/env bash
set -e
ENV="${APP_ENV:-production}"
export LOG_STACK="single,stderr"            # stderr so Coolify's log viewer sees it

# Single-container deploys only. In a compose stack the one-off `migrate` service does this.
if [ "${RUN_MIGRATIONS:-true}" = "true" ] && { [ "$ENV" = "production" ] || [ "$ENV" = "staging" ]; }; then
    bash scripts/migrate.sh                 # wait-for-db, migrate --force, seed reference data
fi

php artisan storage:link --force
if [ "$ENV" = "production" ]; then
    php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan event:cache
fi

[ "${INERTIA_SSR_ENABLED:-false}" = "true" ] && php artisan inertia:start-ssr > storage/logs/ssr.log 2>&1 &

exec php artisan octane:start --server=frankenphp --host=0.0.0.0 --port="${PORT:-8000}" \
    --workers="${OCTANE_WORKERS:-2}" --max-requests="${OCTANE_MAX_REQUESTS:-500}"
```

Queue worker (`scripts/worker.sh`): `exec php artisan queue:work --tries=3 --backoff=10 --max-time=3600 --memory=256 --sleep=1`. Scheduler service: `php artisan schedule:work`.

### 10.4 Environment keys (names only)

| Key | Purpose |
|---|---|
| `APP_ENV`, `APP_URL`, `APP_KEY`, `APP_DEBUG` | basics; build links from `APP_URL`, never from the Host header |
| `PORT`, `OCTANE_SERVER`, `OCTANE_WORKERS`, `OCTANE_MAX_REQUESTS` | Octane process settings (CLI flags in `deploy.sh`; `OCTANE_SERVER` is read by `config/octane.php`) |
| `RUN_MIGRATIONS`, `RUN_QUEUE_WORKER` | which container migrates / runs the queue |
| `INERTIA_SSR_ENABLED`, `INERTIA_SSR_URL` | Inertia SSR server |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | database (production: PostgreSQL) |
| `REDIS_CLIENT` (`phpredis`), `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_DB`, `REDIS_CACHE_DB` | Redis |
| `CACHE_STORE`, `SESSION_DRIVER`, `QUEUE_CONNECTION` | production: `redis` for all three; local: `database` or `array` |
| `FILESYSTEM_DISK`, `DO_SPACES_*` / `AWS_*` | object storage |
| `LOG_STACK` | `single,stderr` in containers |
| `SESSION_SECURE_COOKIE` | `true` behind HTTPS |

Generate the example file from `config/*` keys: lss-v3 reads several keys that `.env.example` omits (section 13). Do not commit real values, and keep `$` out of `REDIS_PASSWORD` (compose interpolates it).

### 10.5 Octane-safety checklist

Workers are long-lived: one PHP process serves many requests.

- No per-request state in `static` properties or singletons. sms has one static (`SchoolPresenceVerifier::$scoped`, schema facts only) and the Fortify response singletons.
- Put per-request tenant/user state in Laravel `Context` (scoped, reset by Octane after each operation) and **always overwrite** long-lived singletons. sms re-applies Spatie's team id through a `Context::hydrated` hook (`AppServiceProvider.php`) and `ResolveSchool` always writes the outcome so one request's school never leaks into the next.
- `Config::set()` per request is safe: Octane's default listener clones config per operation (sms `InertiaPageResponse` relies on this).
- Cache raw arrays, not models (`cache.serializable_classes = false`).
- Never build URLs from the request Host header when proxies are trusted; use `config('app.url')`.
- Add a test that serves several requests on one app instance (sms `tests/Feature/MultiSchool/ResolveSchoolTest.php` shows the pattern).
- Commit `config/octane.php`. sms only generates it at image build with `octane:install`, so worker settings are not reviewable; lss-v3 commits it.

### 10.6 Rolling-deploy rules

- Migrations must be backward compatible: old containers keep serving while `migrate` runs.
- Drain before recreate: touch `storage/framework/draining` (makes `/up` return 500 so the proxy stops routing), wait, then recreate and gate on the container healthcheck.
- Keep `/up` cheap (one `select 1`, one cache read, one file check). Set `stop_grace_period` (30s web, 60s queue in sms).
- Redis alias: give the stack's Redis a unique network alias (`sms-redis`), because Coolify's own Redis answers to `redis` on the shared network and returns `WRONGPASS`.

---

## 11. Table prefix convention `app_`

### 11.1 What lss-v3 does (*Reported*)

- **Literal names, not a connection prefix.** `config/database.php` keeps `'prefix' => ''` on all connections and there is no `DB_PREFIX`.
- 47 of 55 `Schema::create` calls use `app_*` names; 46 of 49 models set `protected $table = 'app_...'`; foreign keys always pass the table explicitly (`->constrained('app_settings_academic_industry')`); pivots are named explicitly (`app_batch_trainer`, `app_trainees_learning_outcomes`); validation uses full names (`exists:app_batches,id`, `unique:app_announcement,subject`).
- **Framework tables stay unprefixed:** `users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `migrations`, and the Spatie tables `roles`, `permissions`, `model_has_permissions`, `model_has_roles`, `role_has_permissions`.
- `app/Models/Notification.php` calls this "the `app_*` convention". Nothing explains why the prefix was chosen; the legacy MySQL dumps it replaced used other prefixes (`fbs_lcss_*`, `lcssv2_*`).

### 11.2 Rule for the boilerplate

**Pick one: literal `app_` names (recommended, matches lss-v3) or Laravel's `DB_PREFIX`. Never both**, or Eloquent produces `app_app_x`.

Why literal names win: the prefix is visible in every query and migration, framework and Spatie tables stay untouched, and nothing depends on a global setting that a raw-SQL qualifier would bypass.

### 11.3 Checklist for a new table

1. Migration: `Schema::create('app_{{table}}', ...)`.
2. Foreign keys: `->constrained('app_other')` (without an argument Laravel guesses an unprefixed name).
3. Model: `protected $table = 'app_{{table}}';`. Do not leave a model without it; an empty stub like lss-v3's `Trainers` points at a table that does not exist.
4. Pivots: pass the pivot table and key names to `belongsToMany`.
5. Validation: `exists:app_{{table}},id`, `unique:app_{{table}},name`.
6. Raw SQL (`DB::table`, `selectRaw`, `orderByRaw`, subqueries): full table name.
7. Seeders and tests: full table name (`DB::table('app_...')`).
8. Explicit index and constraint names: keep them short and prefix them yourself.
9. Morph types store the class name; add a `morphMap` if you ever rename a class.

### 11.4 Gotchas (from lss-v3, *Reported* unless noted)

- Raw SQL with hard-coded names is not renamed by anything: `Trainees::completedHoursSql()` and `pendingTrainerEvalSql()` embed `app_tasks`, `app_batch_trainer`, `app_trainer_evaluations`.
- MySQL identifiers cap at 64 characters. Three derived constraint names are 67-68 characters (for example `app_trainees_learning_outcomes_trainee_id_learning_outcome_id_unique`); give long ones an explicit short name. Postgres truncates at 63.
- `havingRaw` on a `withSum()` alias works on SQLite/MySQL but Postgres rejects output aliases in `HAVING` (`PaymentController`; inferred, not run).
- A `TEXT` column with `->unique()` needs a key length on MySQL.
- `docker-compose.yml` there bind-mounts `./database:/app/database`, which hides the image's migrations and seeders.

### 11.5 sms today: no prefix (*Verified*)

`config/database.php` has `'prefix' => ''`; there is no `DB_PREFIX`. Tables are plain plurals (`schools`, `students`, `rooms`, ...). The one exception is `AppLogger`, which is already `app_loggers`.

**Do not retrofit sms without an explicit decision.** If it adopted `DB_PREFIX=app_`:

| Place | What breaks |
|---|---|
| `AppLogger` (`$table = 'app_loggers'`) | becomes `app_app_loggers` |
| `app/Support/SchoolUsage.php:57` | raw `selectRaw('users.school_id ..., roles.name ...')` qualifiers are not prefixed, so Postgres fails with a missing FROM-clause entry |
| `tests/Feature/Platform/ScaleTest.php` and migration `2026_10_01_000700_add_school_indexes.php` | `Schema::getTableListing()` returns prefixed names and `hasColumn()` prefixes again, so every table is filtered out and the school-index test passes vacuously |
| explicit index names (Spatie migration, `student_grades_unique`) | are not prefixed; Postgres index names share the schema namespace |
| existing databases | Laravel sees no `app_migrations` table and re-runs every migration; a rename needs `ALTER TABLE ... RENAME` on about 50 tables |

Recommendation: new projects, and new tables in new projects, use literal `app_` names. Leave sms as is.

---

## 12. PHP extensions and environment parity

Goal: the same PHP version and extension list on every developer machine, in CI and in the production image, so "works on my machine" and "fails on deploy" disappear.

### 12.1 What is wrong today (*Verified* in sms; lss-v3 *Reported*)

- `composer.json` declares only `"php": "^8.4.1"`: **no `ext-*` entries and no `config.platform`**. A missing extension is found at runtime, not at `composer install`.
- Both apps need extensions that the Dockerfile installs and a developer machine may lack.
- sms local machine: PHP 8.5.0 (Herd Lite) while the image runs 8.4. `php -m` shows no `gd`, `intl`, `pdo_pgsql`, `pgsql` or `pcntl`, so production's PostgreSQL behavior cannot be reproduced locally; dev uses SQLite.
- `php.ini` defaults locally are `upload_max_filesize=2M`, `post_max_size=8M`, while the app accepts uploads up to 4096 KB; the image's values were not verified.
- No `.php-version`, `.nvmrc`, devcontainer or Sail compose file. `laravel/sail` is in `require-dev` with no compose file.
- lss-v3 CI (`tests.yml`) runs PHP 8.3, 8.4 and 8.5 although `composer.json` requires `^8.4.1`, and sets no `extensions:` list.
- Dockerfile uses the floating tag `1-php8.4` and `composer:latest`.

### 12.2 Standard extension set (derived from real usage)

| Extension | Needed for | Declare in `composer.json` | In image | Windows dev (Herd/Laragon/XAMPP) |
|---|---|---|---|---|
| `mbstring` | Laravel, dompdf, search (`mb_strlen`) | yes | base | on |
| `openssl` | `openssl_x509_parse` (domain certs), Laravel | yes | base | on |
| `curl` | `Http::` client | yes | base | on |
| `fileinfo` | Flysystem | yes | base | on |
| `bcmath` | sms `Invoice` (`bcsub`) | yes | installed | enable |
| `gd` (+ FreeType) | PDF images, OG image (`imagettftext` in lss-v3 `OgImage`) | yes | installed | enable |
| `intl` | number/date formatting, if used | only if used | installed | enable |
| `zip` | Composer, imports/exports | yes | installed | on |
| `pdo_sqlite` | tests (in-memory SQLite) | yes | not installed in sms image | on |
| `pdo_pgsql` + `pgsql` | production PostgreSQL | yes | installed | enable |
| `redis` | production cache, session, queue (phpredis) | yes | installed | enable |
| `pcntl`, `posix` | Octane/queue signals, Linux only | **no** (not available on Windows) | installed | n/a |

Trim the table to what your app uses. The table above comes from usage, not from either project's README: the lss-v3 README lists `bcmath` while its code does not use it and its image does not install it; sms uses `bcmath` and installs it.

### 12.3 Recommended boilerplate

1. **Declare extensions in `composer.json`** so `composer install` fails fast on any machine and in the Docker build:

   ```json
   "require": {
       "php": "^8.4.1",
       "ext-bcmath": "*", "ext-curl": "*", "ext-fileinfo": "*", "ext-gd": "*",
       "ext-mbstring": "*", "ext-openssl": "*", "ext-pdo_pgsql": "*",
       "ext-pdo_sqlite": "*", "ext-redis": "*", "ext-zip": "*"
   }
   ```

   Do not declare `ext-pcntl`/`ext-posix` and do not paper over missing ones with `config.platform`: that hides the failure this is meant to expose. Trade-off: every developer needs `redis` and `pdo_pgsql` enabled, which is the point (section 12.4).

2. **Verify with Composer itself:** `composer check-platform-reqs` (native, no custom script). Run it in CI and after any PHP upgrade.
3. **Commit version files:** `.php-version` (`8.4`) and `.nvmrc` (`22`); align `engines.node` in `package.json`.
4. **Pin the image:** exact FrankenPHP tag and `composer:2` instead of floating tags (section 10.2).
5. **CI mirrors the image:** matrix only versions the project supports (`8.4`, plus `8.5` if tested); `shivammathur/setup-php` with `extensions:` set to the same list as the Dockerfile; run the suite once against a PostgreSQL service container, not only SQLite.
6. **Dev parity:** ship a small `docker-compose.dev.yml` (or Sail) with PHP 8.4 + the extension list + PostgreSQL + Redis for anyone who wants production-like behavior. `composer run dev` stays the only documented local entry; Octane is production-only.
7. **README states the list once** (section 12.2), generated from `composer.json`, instead of a hand-written apt line.

### 12.4 Windows developer setup

- Herd, Laragon or XAMPP: enable `gd`, `intl` (if used), `bcmath`, `zip`, `pdo_pgsql`, `pgsql`, `redis` in the active `php.ini` and restart PHP.
- Raise `upload_max_filesize` and `post_max_size` above the largest allowed upload (the app allows 4096 KB).
- Check with `php -v`, `php -m` and `composer check-platform-reqs`.
- If a Windows machine cannot get `pdo_pgsql`/`redis`, use the dev compose file instead of weakening `composer.json`.

*Not verified:* the Docker daemon was off while this report was written, so the image's built-in extensions and `php.ini` values are inferred from the Dockerfile, not inspected. Run `docker run --rm <image> php -m` once and paste the output here.

---

## 13. Do not copy: known defects

Found during exploration. Re-verify before relying on any single item.

### 13.1 sms: frontend

- **Dead and broken table stack.** `components/table/` (`DataTableCardField.tsx`, `cells.tsx`, `components/{CardFilterPanel,ColumnFilterControl,DefaultRecordCard,RecordModal,RecordModalField,ViewToggle,StatusFilter,Toolbar}.tsx`, `hooks/use-card-table-controller.ts`, `hooks/use-record-row-actions.ts`, `types.ts`, `utils/index.ts`) imports modules that do not exist (`@/types/reusable/{fields,card,data-table}`, `@/components/modal/ConfirmInUseModal`, `@/components/Modal`, `@/components/form/Field`, `@/hooks/use-async-select-field`, `@/hooks/use-file-upload-field`). `types/reusable/` contains only `pagination.ts`. Only `components/table/components/Pagination.tsx` and `hooks/index.ts` are live. `npx tsc --noEmit -p tsconfig.app.json` reports errors in about 38 files.
- **Stale barrel.** `api-service/index.ts` re-exports files that do not exist (`admin/partner-school`, `admin/academic`, `admin/batch`, `admin/batch-trainee`, `admin/batch-view`, `admin/trainee`, `admin/leave-category`). Import from the specific files.
- `components/platform/ui.tsx:17`: TS1355 (`as const` on a conditional expression).
- **Copy-pasted helpers:** `apiErrorMessage(err, fallback)` is defined separately in 10 files (`RoomPage.tsx`, `SectionPage.tsx`, `StrandPage.tsx`, `InlineEditableField.tsx`, ...); `downloadCsv` in 3; `useDebouncedValue` exists twice with different defaults (`hooks/useDebouncedValue.ts` 300 ms, `components/table/hooks/index.ts` 350 ms).
- `ConfirmDialog` has a hard-coded `await new Promise(r => setTimeout(r, 350))` before `onConfirm`.
- No `cn`/`clsx`/`tailwind-merge`; classes are joined with template strings. Two `StatCard` components with different props (`components/StatCard.tsx`, `components/platform/StatCard.tsx`).

### 13.2 sms: backend

- `BaseController::beforeCreate()` and `beforeUpdate()` are declared but never called; use `beforeSave()`.
- `store` and `update` return the raw model, not the `Resource`, while list endpoints use the Resource.
- `index()` and `paginationSearch()` call no `authorize()`; access depends on the route `role:` middleware.
- Update is `POST /{id}` by design (uploads); ids are not constrained with `whereNumber`.

### 13.3 sms: deployment

- Docs and config still say **Caddy** while `docker-compose.yml` uses Traefik: `docs/deployment/coolify-single-vps.md` (several lines), `.env.production.example`, `CLAUDE.md:107`, `README.md`, `app/Support/SchoolHost.php`. `deploy/proxy/Caddyfile` and the route `/internal/domain-allowed` are unused by Traefik.
- Floating `FROM dunglas/frankenphp:1-php8.4` and `COPY --from=composer:latest`.
- `scripts/worker.sh` sets `trap term_handler SIGTERM SIGINT` and then `exec`s the worker, so the trap never runs.
- SSR (`inertia:start-ssr`) and the optional in-container queue loop are unsupervised background processes.
- No `.github/` CI and no `php.ini`/opcache settings; `config/octane.php` is not committed.
- The draining flag lives in the container filesystem; a recreated container loses it (intended, but easy to misuse).

### 13.4 lss-v3 (*Reported*)

- **Docs drift:** `CLAUDE.md` and `docs/forms.md` say React Hook Form + Zod; the code uses Formik + Yup. `CLAUDE.md` names `components/table/DataTableField.tsx` (only `DataTableCardField.tsx` exists) and a `pages/admin/` folder that does not exist. `docs/frontend.md`, `docs/prompts.md`, `docs/architecture.md` mention Next.js, Zustand and JWT, none of which are in the stack. `README.md` describes Breeze and `resources/ts/`; the repo uses Fortify and `resources/js`. `docs/refactor-audit.md` reports the documented conventions as largely unadopted.
- `components/ui/` is referenced by `components.json`, ESLint and Prettier ignores but does not exist. 12 Radix packages and `class-variance-authority` are installed with zero imports.
- Two toast systems: `Toast.tsx` (live) and a sonner-based `use-flash-toast` that nothing calls and no `<Toaster/>` mounts.
- `cn` is `filter(Boolean).join(' ')`, no tailwind-merge.
- 2,704 auto-generated `data-cy` attributes across 198 files (`button-button-1`); Cypress selectors break when elements move.
- 15+ frontend files exceed the stated 300-line limit (largest 1071 lines); 7 PHP files do (largest 661). No Form Requests; validation lives in controller methods.
- Deployment: `scripts/deploy.sh` runs `migrate --force` and `db:seed` on every container start; SSR starts even when `INERTIA_SSR_ENABLED=false`; the `./database` bind mount hides image migrations; `GET /cron/{token}` can run a 50 s queue drain inside an Octane worker (`max_execution_time` is 30); `app:env-check` looks for the FrankenPHP binary only at `base_path('frankenphp')`; `tests.yml` matrix includes PHP 8.3 while `composer.json` needs `^8.4.1`; `composer ci:check` calls npm scripts `lint:check` and `format:check` that do not exist; `.claude/launch.json` uses port 8001 while the husky hook expects 8000; `.env.example` omits keys the config reads (`INERTIA_SSR_URL`, `HOLIDAY_API_COUNTRY`, `GCASH_PAYMENT_URL`, `GOOGLE_CHAT_WEBHOOK_URL`, `APP_PREVIOUS_KEYS`).
- `graphify-out/GRAPH_REPORT.md` contains unresolved merge-conflict markers.
- **Do not copy lss-v3's `CLAUDE.md` wholesale.** Lines 60-70 end with a stray note ("add in this file .claude\settings.local.json" followed by `autoMode` / `search_override` JSON) that looks like a leftover personal note, not a project rule. It was not acted on. `SETUP.MD` there also lists seeded account credentials; never copy those.

---

## 14. Gaps and next steps

Optional; none of this was done.

1. Extract shared helpers once: `lib/cn.ts` (with `clsx` + `tailwind-merge`), `lib/apiError.ts`, `lib/downloadCsv.ts`; delete the 10 copies of `apiErrorMessage`.
2. One `components/ui/` folder (and barrel) holding the Tier A components, so a new project copies one directory.
3. Delete the dead `components/table/*` stack in sms, or port lss-v3's `DataTableCardField` + `FormModal` with their `types/reusable/*` files.
4. A Pest CRUD stub or `make:crud` command that emits section 7 from `{{Name}}` and `{{table}}`.
5. Distribution: git subtree or a private composer + npm package for the shared pieces.
6. Refresh sms deployment docs from Caddy to Traefik; commit `config/octane.php`; pin image tags; add a CI workflow with a PostgreSQL job.
7. Add the extension list to `composer.json` and run `composer check-platform-reqs` in CI (section 12).
8. If a markdown screen is wanted, add the section 8 component and its two npm packages.

---

## 15. Team onboarding checklist

- [ ] Install PHP 8.4 and Node 22 (`.php-version`, `.nvmrc`).
- [ ] Enable the extension list from section 12.2; run `composer check-platform-reqs`.
- [ ] `composer install`, `npm install`, copy `.env.example` to `.env`, `php artisan key:generate`.
- [ ] Start with `composer run dev` (not Octane); run `php artisan migrate --seed`.
- [ ] Run `php artisan test` and `npm run types:check`; both must be green before your first commit.
- [ ] New table? Use `app_` names, an explicit `$table`, and full names in `exists:`/`unique:` and raw SQL (section 11).
- [ ] New CRUD screen? Follow section 7; do not write a list page from scratch.
- [ ] Data region on a page? Wrap it in `AppSkeleton`; run `npm run bones:build` if you changed its markup.
- [ ] Feedback and destructive actions: `useToast` and `useConfirm`, never `alert` or `window.confirm`.
- [ ] Octane-safe code: no per-request state in statics or singletons; tenant state in `Context` (section 10.5).
- [ ] Migrations must be backward compatible with the previous release.
- [ ] Do not copy anything listed in section 13.

---

## 16. Using this document with Claude and other AI tools

This report is a **conventions reference**. It tells an AI assistant how this codebase builds things. It does not describe what the system should do.

### 16.1 What it answers

- How to add a CRUD module, component, migration, service or page the repo's way (sections 4-7).
- Deployment, table-naming and PHP-environment rules (sections 10-12).
- What not to copy (section 13).

### 16.2 What it does not answer

It has no goals, roles, module scope, business rules or open product decisions. Those live in:

- `CLAUDE.md`: the multi-school rules and the real-versus-mock module list.
- `PROJECT_STATUS.md`.
- `docs/superpowers/specs/` and `docs/superpowers/plans/`.

To have an assistant analyze what the system wants, point it at those files, not this one. A short `docs/requirements.md` (goals, roles, modules, open decisions) would close the gap; none exists yet.

### 16.3 Make Claude read it

Claude Code loads `CLAUDE.md` every session but does not open `docs/*.md` unless told to. Add a pointer to the project `CLAUDE.md` (the AI agent codemap is linked the same way):

```markdown
- **Reusable components, CRUD template, deployment, `app_` tables, PHP extensions:** read [docs/reusable-components-in-all-projects.md](docs/reusable-components-in-all-projects.md) before adding a CRUD module, shared component, migration, Docker/deploy change or PHP dependency. Section 13 lists code not to copy.
```

For other tools, attach or `@`-mention the file and ask for a section by number. Do not load all of it every time; it is about 830 lines.

### 16.4 Keep it accurate

- Counts and line numbers (`apiErrorMessage` in 10 files, `SchoolUsage.php:57`, about 38 files with type errors) drift. Re-check section 13 after refactors and before relying on it.
- Items labeled *Reported* (lss-v3) were not re-verified line by line.
- `graphify update .` is AST-only, so this markdown is not in the knowledge graph. Use direct reads.
- Update this document when you delete the dead `components/table/*` stack, add `ext-*` entries to `composer.json`, or change the deployment topology.
