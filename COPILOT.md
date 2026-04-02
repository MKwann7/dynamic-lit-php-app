# Copilot Context — dynamic-lit-php-docker-app

> This file exists so GitHub Copilot (and any AI assistant) can bootstrap context
> about this codebase at the start of a new chat session.  Keep it updated as
> significant architecture or convention changes are made.

---

## What this app is

**Maxr** (internal name `maxr.docker` locally) is a white-label site-publishing SaaS platform.
It is a PHP 8 backend serving a **micro-frontend SPA** whose UI is composed entirely of
independently-built **Lit web components** ("widgets") that are loaded on-demand at runtime.
There is no traditional page reload after boot; all navigation is client-side history.pushState.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | PHP 8, Symfony HttpFoundation, Doctrine DBAL, custom MVC shell |
| Frontend runtime | TypeScript, Lit 3, Vite |
| Frontend widgets | Lit 3 web components (each in its own Vite package) |
| Container | Docker / docker-compose |
| DB | MySQL (local: `docker/database/`) |

---

## Repo layout

```
src/app/                  PHP application
  Application/            Framework glue (Router, ServiceManagement, Utilities)
  Code/
    Controllers/Api/      REST API controllers
    Domain/               DB row structs (lightweight, typed)
    Services/             Business logic / DB queries (extend BaseRepository)
    Services/Auth/        JwtService
    Services/Middleware/  MiddlewareRunner (auth gates)
    Security/             Auth / JWT helpers

frontend/
  packages/
    runtime/src/          DynComponentManager + supporting files  ← CORE ENGINE
    shared/src/           Types, RuntimeWidgetElement, BaseEntityList, list-types
    widgets/              Individual Lit widget packages
      account/shell/      Root account layout shell  (renders <dyn-mount>)
      account/dashboard/
      account/sites/
        shell/            "Sites" section shell (declaration-only, parent-slot deps)
        list/             My Sites list  (extends BaseEntityList, scope=owned)
        dashboard/        Site dashboard  (extends RuntimeWidgetElement)
        profile-manage/
        theme-settings/
        user-manage/
      account/groups/
        shell/            Groups section shell
        list/             My Groups list  (extends BaseEntityList, scope=owned)
        dashboard/        Group dashboard
      account/personas/
      admin/
        shell/            Admin app shell  (extends MaxrAccountShell)
        sites/
          shell/          Admin Sites section shell  (parent-slot deps → admin list + dashboard)
          list/           Admin Sites list  (extends MaxrMySitesList, scope=whitelabel)
          dashboard/      Admin Site dashboard  (extends MaxrSiteDashboard)
        groups/
          shell/          Admin Groups section shell
          list/           Admin Groups list  (extends MaxrMyGroupsList, scope=whitelabel)
          dashboard/      Admin Group dashboard  (extends MaxrGroupDashboard)
      login/
      ...
```

---

## Frontend architecture: the widget system

### Core concept

Every piece of UI is a **widget** — a Lit custom element.  Widgets are NOT bundled
together; each is a separate JS/CSS build artefact served from `/assets/widgets/…`.

The **`DynComponentManager`** (runtime) is the single orchestrator:
- It holds all registries (manifests, modules, mounts, routing).
- It fetches manifests from the API, dynamically imports their JS, installs their CSS.
- It manages a tree of `<dyn-mount>` points in the DOM, swapping components in and out
  with CSS transitions.
- It owns browser history (pushState / popState).

### Component manifest (`component.json` / `WidgetManifest`)

Every widget ships a `component.json` describing it:

```json
{
  "id":          "<uuid>",            // stable public ID
  "name":        "Human name",
  "tag":         "my-widget",         // legacy HTML tag (may differ from el_name)
  "el_name":     "maxr-my-widget",    // actual custom element tag used in document.createElement
  "uri":         "/account/sites",    // route this manifest owns
  "version":     "1.0.0",
  "framework":   "lit",
  "entry":       "/assets/…/index.js",
  "cssPath":     "/assets/…/index.css",
  "renderMode":  "shadow" | "light",  // shadow → ShadowRoot, light → light DOM
  "exports":     { "define": "defineWidget" },
  "dependencies": [ … ]              // see dependency types below
}
```

### Dependency types

| `type` | Meaning |
|---|---|
| `"inline"` (default) | Mounted into a `<dyn-slot name="…">` inside the same component's template. Static, always loaded. |
| `"slot"` | Mounted into a `<dyn-mount id="…">` **inside this component's own template**. Route-driven: `path` controls which dep is active. |
| `"parent-slot"` | Same as slot but the `<dyn-mount>` lives in the **parent** component's template. Used by "shell" declaration widgets (e.g. `account/sites/shell`) that describe which widgets go into the parent's mount point for each URL path. |
| `"standalone"` | Loaded but not mounted into the DOM directly. |

### Path matching on deps

The `path` field on a slot/parent-slot dep controls which URL activates it:

| `path` value | Matches |
|---|---|
| `"/"` or `""` | Default — matches when no further URL segment exists at this depth |
| `"my-sites"` | Exact named segment match |
| `"{uuid}"` | Any UUID v4 segment (stored in `routeParams.uuid`) |
| `"{int}"` | Any positive integer segment (stored in `routeParams.int`) |

---

## The central mount point

The account shell (`884f9a89`) renders:
```html
<dyn-mount id="f559b17e-fed9-4484-adb6-8632ebf647c0"></dyn-mount>
```
**`f559b17e-fed9-4484-adb6-8632ebf647c0`** is the primary content mount used by all
account-area section shells (`account/sites/shell`, `account/groups/shell`, etc.)
and their list/dashboard children.  The same mount ID is also used by the admin section
shells (`admin/sites/shell`, `admin/groups/shell`).

---

## Known widget UUIDs

### Account

| Widget | UUID |
|---|---|
| Login | `122160fe-9981-4d3d-8218-fabdd279713a` |
| Forgot password | `a8a78b4c-d880-4226-85bb-7b3b8b262fc8` |
| Create account | `90346c8c-1c44-46bc-87c8-5afd3a2e0391` |
| Account shell (root) | `884f9a89-9df6-4c10-9c83-3b2d9f7d6a11` |
| Account dashboard | `c6a9e0c8-0407-4a8a-b726-6024a9026288` |
| Site shell (root of /account/site) | `9e4bcfcb-a458-4bda-8c1c-671173b79df8` |
| Sites section shell (`my-site-shell`) | `22858f3d-af0b-43bc-9b82-1d5c4b6cfe86` |
| Sites list (`my-sites-list`) | `f38419fd-e9a9-4b59-9c49-396cac867a7f` |
| Site dashboard (`my-site-dashboard`) | `5f87e9f7-c5ed-40ab-abc1-944a8733a3c4` |
| Groups section shell (`my-group-shell`) | `d5531037-f587-42e9-baf1-f409b452a7d0` |
| Groups list (`my-groups-list`) | `2d2dc08d-25a4-43ae-9e7b-afae92788222` |
| Group dashboard (`my-group-dashboard`) | `9bf9e360-1a53-402d-a7ea-612b947ca293` |
| Group shell | `9e6fbbd4-f7f0-4fa7-b0a7-4ef5d2f4f1c9` |
| Persona shell | `3ca0b3a2-08b0-4df0-9049-78cf163e9d7d` |

### Admin

| Widget | UUID |
|---|---|
| Administrator shell (`admin-shell`) | `fdb6d0fe-2b7e-4709-a0f7-2ec2d6d8ea2b` |
| Admin Sites section shell (`admin-sites-shell`) | `54b49430-e9f8-4144-b45b-adf2b377af9a` |
| Admin Sites list (`admin-sites-list`) | `2f210e3b-d4b3-4fc3-ba00-577e7745be96` |
| Admin Site dashboard (`admin-site-dashboard`) | `259955dc-6deb-419b-a00f-e1da00734638` |
| Admin Groups section shell (`admin-groups-shell`) | `aeae410a-eefd-445d-8b14-801cbc9b89e4` |
| Admin Groups list (`admin-groups-list`) | `62b74c00-d006-4416-bb79-8d9662d42ec5` |
| Admin Group dashboard (`admin-group-dashboard`) | `e0908bdf-231d-413b-bd89-60f81184c9e1` |

---

## Admin vs Account widget pattern

Account and admin widgets share base classes. The two layers differ only in:

1. **API scope** — controlled by `buildExtraParams()` on the list class.
2. **Dashboard UUID** — the list's `dashboardComponentId` property points to the
   same-layer dashboard, not the account one.
3. **Shell `component.json` dependencies** — point to the admin list + dashboard UUIDs.

| Concern | Account | Admin |
|---|---|---|
| `buildExtraParams()` | `{ scope: 'owned' }` | `{ scope: 'whitelabel' }` |
| Filters by | `owner_id` / `site_user_id` matching logged-in user | `whitelabel_id` matching logged-in admin |
| Base class | `BaseEntityList` | Account list class (e.g. `MaxrMySitesList`) |

The `scope` query param is interpreted server-side in the controller/repository layer.

---

## URL routing flow

### Initial page load (e.g. `/account/sites/8b062815-…`)

1. PHP serves `index.php` for every route (SPA shell).
2. `DynComponentManager.run()` starts.
3. `getFirstPathSegment()` → `"account"` → looks up `MAIN_APP_WIDGET_IDS['account']`.
4. Fetches manifest for account shell (`884f9a89`), loads its JS, mounts it.
5. `resolveUriChain(['sites', '8b062815-…'], …)` walks remaining segments:
   - `"sites"` — no dep match on account shell → calls `getManifestByUri('/account/sites')` → returns the **sites section shell** manifest (`22858f3d`). That manifest carries two `parent-slot` deps targeting mount `f559b17e`:
     - `path: "/"` → sites list (`f38419fd`)
     - `path: "{uuid}"` → site dashboard (`5f87e9f7`)
   - `"8b062815-…"` — matches `{uuid}` pattern → loads site dashboard into `f559b17e`, with `routeParams: { uuid: "8b062815-…" }`.
6. `replaceInitialHistoryState()` stamps the current browser entry with `__dyn__` metadata pointing at the deepest active mount.

### Subsequent navigation (e.g. user clicks a list row)

1. Widget calls `this.runtime.loadComponentById(DASHBOARD_ID, { transitionType: 'left', routingContext: { anchorSegment: uuid, anchorDepth: 2, routeParams: { uuid } } })`.
2. `DynComponentManager.loadComponentById` runs a left-slide transition, pushes history.
3. `window.history.pushState({ __dyn__: true, mountId, widgetId, path, routingContext }, '', '/account/sites/<uuid>')`.

---

## `navigateBack()` — three cases

```
navigateBack(mountId)
  │
  ├─ Case 1: mountRecord.history.length > 0
  │    → window.history.back()   (popstate fires → handlePopState restores with right-slide)
  │
  ├─ Case 2: currentEl.__dyn_source_widget_id__ is set
  │    → The element was loaded on top of a known predecessor in the same session.
  │       loadComponentById(sourceId, { transitionType: 'right', pushHistory: true })
  │
  └─ Case 3: fresh URL load, no source info (user pasted UUID URL directly)
       → Strip trailing UUID from activePath to get parentUrl.
          Scan manifestRegistry for a manifest whose uri === parentUrl, find
          its "/" parent-slot dep targeting this mountId.
          loadComponentById(parentWidgetId, { transitionType: 'right', pushHistory: true })
```

**Important:** `replaceInitialHistoryState()` does only a `replaceState` (no pushState).
Case 3 must NOT call `window.history.back()` — there is no parent entry in the stack
on a fresh page load; doing so loops back to the same URL forever.

---

## `executeTransition` — animation engine

Transitions run between the outgoing and incoming widget elements inside a
`<dyn-mount>` container.

| `type` | Description |
|---|---|
| `'none'` | Instant swap, no CSS |
| `'fade'` | Opacity 0→1 / 1→0 simultaneously |
| `'left'` | Outgoing exits left (−100%), incoming enters from right (+100%) |
| `'right'` | Outgoing exits right (+100%), incoming enters from left (−100%) |

**Critical implementation note — `transitionend` guard:**
Both the fade and slide handlers use a **named function** that guards on
`e.target === incoming && e.propertyName === 'opacity'|'transform'`.
Do NOT use `{ once: true }` without this guard — child elements (e.g. cards with
`box-shadow` transitions) bubble their own `transitionend` events and will fire the
listener prematurely, cutting the animation short.

---

## `FloatShield` — modal / overlay system

`FloatShield` (`float-shield.ts`) is a singleton overlay appended to `<body>`.

| Mode | Description |
|---|---|
| `spinner` | Full-screen semi-transparent spinner GIF |
| `modal` | Dark backdrop with centred white panel hosting a loaded widget |
| `anchored` | Transparent backdrop with an arrow-annotated popover panel anchored to a DOM element |

**Runtime API** (available to every widget via `this.runtime`):
- `showSpinner()` / `hideSpinner()`
- `openModal(widgetId, options?)`
- `openAnchoredModal(widgetId, anchorEl, options?)`
- `closeModal()`

---

## `RuntimeWidgetElement` — base class for all widgets

Located in `frontend/packages/shared/src/runtime-widget.ts`.
All widgets extend this (directly or via `BaseEntityList`).

Key helpers available inside any widget:

```typescript
this.runtime                        // WidgetRuntime — the full manager API
this.getAccessToken()               // current JWT string
this.getTokenType()                 // 'user' | 'admin' | 'session' | null
this.getAdminPermissions()          // string[] of admin permission keys
this.hasAdminPermission('key')      // boolean
this.getAppIdentity()               // AppIdentity | null  (name, domain, uuid, type)
this.getRouteParam('uuid')          // string | null — wildcard from URL
this.getRouteParam('int')           // string | null
this.navigateBack()                 // calls runtime.navigateBack() for this mount
this.runtime.loadComponentById(id, options)
this.runtime.loadComponentOnMount(id, mountId, options)
this.runtime.navigateTo(path, options)   // finds dep by path on current manifest
this.runtime.apiFetch(url, options)      // Bearer-authenticated fetch
this.runtime.openModal(widgetId)
this.runtime.openAnchoredModal(widgetId, el)
this.runtime.closeModal()
```

`renderMode: 'light'` → component renders into the light DOM (no shadow root); styles are
injected into `<head>` once per tag name via `_injectLightStyles()`.
`renderMode: 'shadow'` → standard Lit ShadowRoot.

---

## `BaseEntityList<T>` — reusable CRUD list

Located in `frontend/packages/shared/src/base-entity-list.ts`.
Provides a card/list-view grid with search, filter dropdown, and pagination.

Subclasses must implement:
```typescript
protected abstract apiPath: string;               // e.g. '/api/v1/sites'
protected abstract fields: FieldDef<T>[];         // column/card schema
protected abstract onItemOpen(item: T): void;     // double-click / open action
```

Optional overrides: `filters`, `createLabel`, `itemUpdatedEvent`, `getBannerUrl`,
`getCardTitle`, `getCardSubtitle`.

**`buildExtraParams()` — API scope hook:**
Override to inject additional query parameters into every fetch.  The base returns `{}`.
```typescript
// Account list — restrict to records owned by / assigned to the logged-in user:
protected override buildExtraParams(): Record<string, string> {
    return { scope: 'owned' };
}

// Admin list — stream all records for the admin's whitelabel:
protected override buildExtraParams(): Record<string, string> {
    return { scope: 'whitelabel' };
}
```

The list calls:
```
GET {apiPath}?page=N&q=…&filter=…&search_fields=…[&scope=owned|whitelabel]
```
and expects `ListApiResponse<T>`:
```typescript
{ success: boolean; data: T[]; meta: { page, pages, total, perPage } }
```

---

## PHP API endpoints (relevant to the frontend)

| Method | Path | Middleware | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/session` | `auth:global` | Refresh / issue session JWT |
| POST | `/api/v1/auth/login` | `auth:session_or_user` | Password login |
| GET | `/api/v1/components/resolve-by-uri?uri=…` | `auth:session_or_user` | Old two-step resolve (still used) |
| GET | `/api/v1/components/manifest-by-uri?uri=…` | `auth:session_or_user` | Single-request manifest fetch ← preferred |
| GET | `/api/v1/components/{uuid}/manifest` | `auth:session_or_user` | Manifest by UUID |
| GET | `/api/v1/sites` | `auth:session_or_user` | Sites list — accepts `?scope=owned\|whitelabel` |
| GET | `/api/v1/sites/{uuid}` | `auth:session_or_user` | Single site |
| PUT | `/api/v1/sites/{uuid}` | `auth:user_or_admin[sites.edit_all]` | Update site |
| POST | `/api/v1/sites` | `auth:user_or_admin[sites.edit_all]` | Create site |
| DELETE | `/api/v1/sites/{uuid}` | `auth:user_or_admin[sites.edit_all]` | Delete site |
| GET | `/api/v1/users/{id}` | `auth:user_or_admin[customers.view_all]` | Get user |
| PUT | `/api/v1/users/{id}` | `auth:user_or_admin[customers.edit_all]` | Update user |
| POST | `/api/v1/users` | `auth:user_or_admin[customers.edit_all]` | Create user |
| DELETE | `/api/v1/users/{id}` | `auth:user_or_admin[customers.edit_all]` | Delete user |
| GET | `/api/v1/whitelabels/{id}` | `auth:session_or_user` | Get whitelabel |
| PUT | `/api/v1/whitelabels/{id}` | `auth:user_or_admin[platform.settings.edit]` | Update whitelabel |
| POST | `/api/v1/whitelabels` | `auth:user_or_admin[platform.settings.edit]` | Create whitelabel |
| DELETE | `/api/v1/whitelabels/{id}` | `auth:user_or_admin[platform.settings.edit]` | Delete whitelabel |

The manifest endpoints are served by `ComponentsController` →
`AggregateComponentService` which joins `component_route`, `component`, and
`component_version` tables. Dependencies come from `component_dependency` joined to
`component`.

---

## Auth / JWT

- Tokens are stored in `localStorage` under key `"access_token"`.
- Token types: `"user"`, `"admin"`, `"session"`.
- `token_type: 'admin'` tokens carry a `data.permissions[]` array of permission keys.
- `AppIdentity` (name, domain, uuid, type) is decoded from `payload.data.app`.
- Route guards in `loadInitialRoute()`:
  - `/login` → redirect to `/account` if already a user/admin token.
  - `/administrator` → redirect to `/login` if not admin.
  - `/account` → redirect to `/login` if not user or admin.

### Middleware gates (`MiddlewareRunner.php`)

| Middleware string | Accepts |
|---|---|
| `auth:global` | Any token (or none) — attaches payload if valid, never blocks |
| `auth:session_or_user` | Session, user, or admin tokens |
| `auth:user` | User token only |
| `auth:admin` | Admin token only |
| `auth:user_or_admin` | User or admin token (no permission check) |
| `auth:user_or_admin[permission]` | User token **OR** admin token with `permission` in `data.permissions[]` |

**Permission-scoped gate (`auth:user_or_admin[permission]`):**
- **User token** → always passes; data-layer scoping (`scope=owned`) limits what they can touch.
- **Admin token with permission** → passes; sets `auth_payload` + `auth_token_type` on request attributes.
- **Admin token without permission** → `403 Forbidden`.
- **No / invalid token** → `401 Unauthorized`.

### Known admin permission keys

| Permission key | Controls |
|---|---|
| `sites.view_all` | Read all sites in the whitelabel |
| `sites.edit_all` | Create / update / delete any site in the whitelabel |
| `customers.view_all` | Read all users/customers |
| `customers.edit_all` | Create / update / delete any user/customer |
| `platform.settings.view` | Read whitelabel / platform settings |
| `platform.settings.edit` | Update whitelabel / platform settings |

---

## `MountRoutingContext`

Passed from parent to child every time a component is loaded. Never declared by the
widget itself — always imposed by the caller.

```typescript
interface MountRoutingContext {
  behavior:      'route' | 'subroute' | 'modal' | 'silent';
  anchorSegment: string;   // URL segment this component "owns" (or pattern literal "{uuid}")
  anchorDepth:   number;   // 0-based index in path segments array
  routeParams?:  Record<string, string>;  // e.g. { uuid: "bc07…" }
  modalParam?:   string;
  modalValue?:   string;
}
```

`anchorSegment` is kept as the **pattern literal** (e.g. `"{uuid}"`) internally so
depth calculations stay stable; the real runtime value lives in `routeParams`.
`buildRoutePath()` resolves the literal back to the real value when constructing URLs.

---

## `HistoryState` (browser history entries)

Every `pushState` / `replaceState` call stamps this shape:
```typescript
{
  __dyn__:        true,       // guard: ignore non-dyn popstate events
  mountId:        string,     // which mount to restore
  widgetId:       string,     // which widget to load
  path:           string,     // full URL path
  routingContext: MountRoutingContext | null,
}
```

`handlePopState` reads this and calls `loadComponentById` with `historyOp: 'pop'`
and `transitionType: 'right'`.

---

## `MountRecord` (in-memory per mount)

```typescript
interface MountRecord {
  id:                  string;
  mountElement:        HTMLElement;          // the <dyn-mount> DOM element
  activeWidgetElement: HTMLElement | null;   // currently rendered widget
  activeManifestId:    string | null;
  history:             string[];             // stack of previous widgetIds (for Case 1 back)
  activePath:          string | null;        // full URL of currently active widget
  routingContext:      MountRoutingContext | null;
}
```

`mountRecord.history` is the internal stack used only by `navigateBack` Case 1.
It is separate from the browser history stack.

---

## Custom HTML elements

| Element | Description |
|---|---|
| `<dyn-slot name="el-name">` | Placeholder for `type:"inline"` deps. Matched by `name` attr to a dep's `el_name`. |
| `<dyn-mount id="uuid">` | Named mount point for `type:"slot"` and `type:"parent-slot"` deps. `id` must match dep's `mount_id`. Sets `display:block; position:relative; overflow:hidden`. |

---

## `__dyn_source_*` properties (navigateBack Case 2)

When `loadComponentById` loads a new widget on top of an existing one, it stamps
the new element's DOM object (not attributes) with:
```typescript
newElement.__dyn_source_widget_id__       = previousManifestId;
newElement.__dyn_source_path__            = previousPath;
newElement.__dyn_source_routing_context__ = previousRoutingContext;
```
This lets `navigateBack` Case 2 know where to return even after a full page reload
is not possible — but this data is only available within the same JS session.

---

## Common patterns / conventions

### Navigating to a detail view (list → dashboard)
```typescript
// Inside a list widget's onItemOpen(item):
void this.runtime?.loadComponentById(DASHBOARD_WIDGET_ID, {
  transitionType: 'left',
  routingContext: {
    behavior:      'route',
    anchorSegment: item.uuid,   // the UUID segment to append to URL
    anchorDepth:   2,           // depth in path: /account/sites/<uuid>
    routeParams:   { uuid: item.uuid },
  },
});
```

### Reading the UUID in the dashboard
```typescript
// Inside the dashboard widget's connectedCallback():
this.siteUuid = this.getRouteParam('uuid');
```

### Going back from a dashboard
```typescript
// The red back button:
private onBackClick(): void { this.navigateBack(); }
```

### Cross-mount navigation (loading into a specific mount)
```typescript
this.runtime.loadComponentOnMount(widgetId, 'f559b17e-fed9-4484-adb6-8632ebf647c0', options);
```

### Creating a new admin widget that extends an account widget

1. Add `"exports": { ".": "./src/index.ts" }` to the account package's `package.json`
   and re-export the class from its `index.ts`.
2. Add the account package as a dependency in the admin widget's `package.json`.
3. Extend the account class, override `buildExtraParams()` and `dashboardComponentId`.
4. Run `npm install` from `frontend/` to re-link workspace packages.

```typescript
@customElement('maxr-admin-sites-list')
export class MaxrAdminSitesList extends MaxrMySitesList {
    override dashboardComponentId = ADMIN_DASHBOARD_COMPONENT_ID; // admin UUID
    protected override buildExtraParams() { return { scope: 'whitelabel' }; }
}
```

---

## Bugs fixed (history — may be relevant if symptoms recur)

### Back-button loops forever on fresh UUID URL load (fixed 2026-03-29)
**Symptom:** Pressing back from `/account/sites/<uuid>` after a direct page load/refresh
stays on the same URL forever.  
**Root cause:** `navigateBack` Case 3 was calling `window.history.back()` but
`replaceInitialHistoryState()` never pushes a parent entry — only does `replaceState`.  
**Fix:** Case 3 now resolves the parent widget via manifest registry and calls
`loadComponentById` directly.

### Partial / truncated slide animation (fixed 2026-03-29)
**Symptom:** Navigating from a list to a dashboard produces a partial slide (~0.12s)
instead of the full 0.4s slide.  
**Root cause:** The `transitionend` listener used `{ once: true }` without a
`target + propertyName` guard. Child element transitions (e.g. card `box-shadow`)
bubbled up and triggered the cleanup handler early.  
**Fix:** Replaced anonymous `{ once: true }` with a named `onFadeEnd` function that
guards `e.target !== incoming || e.propertyName !== 'opacity'` — matching the pattern
already used by the slide path's `onSlideEnd`.

### `GET /api/v1/sites` returning "Http method not allowed" (fixed 2026-03-29)
**Symptom:** The Sites list widget received a method-not-allowed error instead of data.  
**Root cause:** The `getList` route was registered under the key
`"api/v1/sites/{site_uuid}::get"` — the same key as `getById`. PHP silently drops
duplicate array keys, so `getList` was overwritten and only the `POST` key for that
path survived.  
**Fix:** Changed the `getList` route key to `"api/v1/sites::get"` (no `{site_uuid}`).

### Site profile PUT returning "Unauthorized" for admin users (fixed 2026-03-29)
**Symptom:** Admin users received `401 Unauthorized` when submitting the Edit Site
Profile form (PUT `/api/v1/sites/{uuid}`).  
**Root cause:** The route used `['auth:user']` middleware, which calls
`tryDecodeUserTokenFromBearer` and rejects admin tokens outright.  
**Fix:** Introduced the `auth:user_or_admin[permission]` middleware format.
Admin tokens pass when `data.permissions[]` contains the required key; user tokens
always pass (data-layer scoping handles their restrictions).  All write routes for
sites, users, and whitelabels were updated to the permission-scoped format.

### User dashboard profile blank after back-navigation from a child site (fixed 2026-03-30)
**Symptom:** Navigating to a site from within the user dashboard (e.g.
`/administrator/users/{userUUID}/sites/{siteUUID}`), refreshing the page, and then
pressing the back button returns to the user dashboard but the profile card shows no
data — all fields display `—`.  
**Root cause:** In `loadComponentById`, `mountRecord.routingContext` was overwritten
with the **incoming** component's routing context (containing `routeParams: { uuid: siteUUID }`)
**before** `previousRoutingContext` was captured. The line:
```typescript
const previousRoutingContext = mountRecord.routingContext;
```
appeared after the update block, so `__dyn_source_routing_context__` on the incoming
element was stamped with the site's UUID rather than the user's UUID.  
When `navigateBack()` Case 2 fired, it reloaded the user dashboard with
`routeParams: { uuid: siteUUID }`, causing the API call `GET /api/v1/users/{siteUUID}`
to fail and the profile to stay empty.  
**Fix:** `previousRoutingContext` is now captured from `mountRecord.routingContext`
**before** the routing-context update block, so the outgoing component's context is
correctly preserved and stamped on `__dyn_source_routing_context__`.

### User dashboard back button cycles to site instead of user list after Case-2 back (fixed 2026-03-30)
**Symptom:** After navigating user-list → user-dashboard → site-dashboard, then
refreshing and pressing back (site → user-dashboard via Case 2), pressing back a second
time on the user dashboard goes to the **site dashboard** instead of the **user list**.  
**Root cause:** `navigateBack` Case 2 called `loadComponentById` with `pushHistory: true`
and the default `historyOp: 'push'`. This pushed the site dashboard's manifest ID onto
`mountRecord.history` and stamped `__dyn_source_widget_id__ = siteDashboardId` on the
newly loaded user dashboard element. On the next back press, Case 1 (`history.length > 0`)
fired and called `window.history.back()` — landing back on the site dashboard URL.  
**Fix:**  
1. Added `skipSourceStamp?: boolean` to `LoadComponentOptions`. When `true`,
   `loadComponentById` skips stamping `__dyn_source_widget_id__ / path / routing_context`
   on the incoming element.  
2. Case 2 in `navigateBack` now passes `historyOp: 'none'` (leaves `mountRecord.history`
   untouched) and `skipSourceStamp: true` (no source chain set up on the restored
   component). With no internal history and no source stamp, the *next* back press from
   the user dashboard falls through to Case 3, which strips the trailing UUID from the
   active path (`/administrator/users/{uuid}` → `/administrator/users`), looks up the
   users-section shell, finds its `"/"` parent-slot dep (the users list), and navigates
   there correctly.

