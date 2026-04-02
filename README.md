# Dynamic Lit PHP Docker App

A full-stack local development platform built on PHP 8.3, featuring a custom MVC-style HTTP framework, JWT authentication, a multi-database MySQL backend, a dynamic [Lit](https://lit.dev/) web component system, and a Go media microservice — all orchestrated with Docker Compose.

---

## Architecture Overview

The stack consists of four Docker services that work together:

| Service | Container | Port(s) | Description |
|---|---|---|---|
| PHP App | `dynlit-app` | `3000` (HTTP), `4000` (HTTPS) | Core PHP application server |
| MySQL | `dynlit-db` | `3318` (external) | MySQL 8.4 database |
| Assets | `dynlit-assets` | `3001` | Nginx serving compiled frontend JS/CSS |
| Media | `dynlit-media` | `3002` | Go microservice for image upload/delete |

The PHP application uses **Symfony Routing** and **HttpFoundation** for HTTP primitives, with a hand-rolled service container and middleware pipeline on top.

---

## Setup

### Prerequisites

- [Docker](https://www.docker.com/get-started) installed and running
- [Composer](https://getcomposer.org/) installed
- [Node.js](https://nodejs.org/) (via [nvm](https://github.com/nvm-sh/nvm) recommended) — required for frontend work

### Getting Started

1. This application runs on `PHP 8.3`, so make sure that is available.
2. In the directory, execute `composer install`.
   - The `vendor/` directory is mounted into the container as a volume, so no rebuild is needed after dependency changes.
   - To update dependencies later: `make refresh-composer`
3. Execute `make run` to build and start all containers. The app will be available at http://localhost:3000.

### Environment Variables

The environment is configured via `docker/env/app-local.env`. Key variables:

| Variable | Description |
|---|---|
| `DB_HOST` / `DB_PORT` | Internal DB host/port (within Docker network) |
| `DB_HOST_EXTERNAL` / `DB_PORT_EXTERNAL` | External DB access from host machine |
| `DB_USER_DATABASE` | MySQL database for user records |
| `DB_MAIN_DATABASE` | MySQL main application database |
| `DB_COMPONENTS_DATABASE` | MySQL database for component registry |
| `DB_IDENTITY_DATABASE` | MySQL database for whitelabel configs |
| `DB_MEDIA_DATABASE` | MySQL database for media metadata |
| `JWT_SECRET` | HS256 secret used to sign/verify all JWTs |
| `JWT_ISSUER` / `JWT_AUDIENCE` | JWT `iss` and `aud` claims |
| `APP_ENV` | Runtime environment (`local`, `nonprod`, etc.) |
| `MEDIA_SERVER_URL` | URL of the Go media service |

---

## PHP Application

### Entry Point & Bootstrap

The application boots from `src/public/index.php` → `src/app/app.php` → `Application\Main`.

`Main` initialises three core objects and then dispatches to either `runServer()` (HTTP) or `runCommands()` (CLI):

- **`Services`** — lazy service locator built on Symfony's `ContainerBuilder`
- **`Router`** — registers all routes and resolves them against the incoming request
- **`HttpRequest`** — wraps the Symfony `Request` object

### Routing

Routes are registered in `Application\Routing\Router` as `RouteInstance` objects. Each route carries:
- URI pattern (with optional parameters, e.g. `{site_uuid}`)
- Controller class and method name
- HTTP method
- Middleware list (e.g. `['auth:session_or_user']`)
- URI parameter type constraints

After URL matching, `MiddlewareRunner` runs the route's middleware chain. If all middleware passes, the controller method is invoked and its `Response` is sent.

### Middleware & Auth Guards

Every route is assigned one of the following auth guards:

| Guard | Behaviour |
|---|---|
| `auth:global` | Allows all requests through (identity check only) |
| `auth:session_or_user` | Requires a valid session or user JWT |
| `auth:user` | Requires a user JWT |
| `auth:admin` | Requires an admin JWT |
| `auth:user_or_admin` | Requires either a user or admin JWT |
| `auth:user_or_admin[permission]` | Requires user/admin JWT; admin must also carry the named permission |

### Identity System

On each request the application resolves an **identity** from the incoming domain. An identity is either a `site` or a `whitelabel`, resolved by `SiteIdentityResolver` and `WhitelabelIdentityResolver` respectively. Controllers can access the resolved identity via `$this->identity()` or `$this->requireIdentity()`.

### JWT Security

JWTs are signed with HS256 via the `firebase/php-jwt` library. `JwtTokenService` handles encode/decode/validation. `JwtService` provides higher-level helpers to extract session, user, or admin payloads from a `Bearer` token. Multiple token types are supported (`session`, `user`, `admin`), each carrying different claims and permissions.

### Database Layer

The app uses raw PDO wrapped in a thin `DatabaseClient` utility class. Multiple named connections are managed by `DatabaseConnectionRegistry`, which lazily creates connections from environment variables. Repositories extend `BaseRepository` and declare which named connection to use.

`DatabaseClient` exposes convenience methods:

| Method | Description |
|---|---|
| `fetchOne` | Fetch a single row |
| `fetchAssociative` | Fetch a single row as associative array |
| `fetchAll` | Fetch all rows |
| `fetchAllAssociative` | Fetch all rows as associative arrays |
| `execute` | Execute a statement (INSERT / UPDATE / DELETE) |

### Base Classes

- **`BaseController`** — all controllers extend this. Provides access to the request, `Services`, bearer token extraction, JWT payload helpers, identity accessors, and a `returnBasePage()` helper that renders the core HTML shell.
- **`BaseRepository`** — all repositories extend this. Provides lazy-loaded PDO/`DatabaseClient` access for a named DB connection.

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/session` | global | Create a session token |
| `POST` | `/api/v1/auth/login` | session or user | Authenticate with email/username + password, returns a user JWT |

### Sites

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/sites` | session or user | List all sites |
| `GET` | `/api/v1/sites/{site_uuid}` | session or user | Get site by UUID |
| `GET` | `/api/v1/sites/{site_uuid}/check-unique` | session or user | Check name uniqueness |
| `POST` | `/api/v1/sites` | user or admin `[sites.edit_all]` | Create a new site |
| `PUT` | `/api/v1/sites/{site_uuid}` | user or admin `[sites.edit_all]` | Update a site |
| `DELETE` | `/api/v1/sites/{site_uuid}` | user or admin `[sites.edit_all]` | Delete a site |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/users` | session or user | List all users |
| `GET` | `/api/v1/users/{user_id}` | user or admin `[customers.view_all]` | Get user by numeric ID |
| `GET` | `/api/v1/users/{user_uuid}` | user or admin `[customers.view_all]` | Get user by UUID |
| `POST` | `/api/v1/users` | user or admin `[customers.edit_all]` | Create a user |
| `PUT` | `/api/v1/users/{user_id}` | user or admin `[customers.edit_all]` | Update user by numeric ID |
| `PUT` | `/api/v1/users/{user_uuid}` | user or admin `[customers.edit_all]` | Update user by UUID |
| `PATCH` | `/api/v1/users/{user_uuid}/avatar` | user or admin | Update user avatar |
| `DELETE` | `/api/v1/users/{user_id}` | user or admin `[customers.edit_all]` | Delete a user |

### Components

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/components/resolve-by-uri` | session or user | Resolve a component route to its manifest metadata |
| `GET` | `/api/v1/components/manifest-by-uri` | session or user | Fetch the full component manifest by URI |
| `GET` | `/api/v1/components/{uuid}/manifest` | session or user | Fetch the full component manifest by UUID |

### Whitelabels

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/whitelabels/{whitelabel_id}` | session or user | Get whitelabel config by ID |
| `POST` | `/api/v1/whitelabels` | user or admin `[platform.settings.edit]` | Create a whitelabel |
| `PUT` | `/api/v1/whitelabels/{whitelabel_id}` | user or admin `[platform.settings.edit]` | Update a whitelabel |
| `DELETE` | `/api/v1/whitelabels/{whitelabel_id}` | user or admin `[platform.settings.edit]` | Delete a whitelabel |

### Page Routes (HTML Shell)

The following routes all render the core HTML shell, bootstrapping the frontend Lit runtime:

`GET /login` · `GET /account` · `GET /create-account` · `GET /forgot-password` · `GET /administrator` · `GET /persona` · `GET /group`

---

## Frontend — Dynamic Lit Component System

The frontend lives in `frontend/` and is a Node.js workspace with three packages:

| Package | Description |
|---|---|
| `@dynlit/runtime` | The dynamic component manager — loads Lit web components on demand |
| `@dynlit/shared` | Shared TypeScript types and base widget class used by all components |
| `packages/widgets/**` | Individual Lit web components, each in their own package |

Built with **Vite** + **TypeScript**.

### How it works

1. The PHP backend renders a single HTML shell (`returnBasePage()`) that bootstraps a JSON config object and loads `dyn-component-manager.js` from the assets server.
2. The **dynamic component manager** reads the config, calls `/api/v1/components/resolve-by-uri` to find the root component for the current route, then fetches its manifest (`/api/v1/components/{uuid}/manifest`).
3. The manifest describes the component's JS entry path, CSS, version, render mode, dependencies, and exported parts. The manager dynamically imports the JS bundle and mounts the component into the shell.
4. Components can declare child slots (`<dyn-slot>`) which the manager fills recursively.

### Component Registry

The database-backed component registry stores component metadata (name, tag, URI, version, entry path, etc.). When you deploy new components, the registry is synced with `make ui-deploy` or `make ui-full-deploy`.

### Scaffolding a New Component

```bash
make ui-component \
  location="account/my-feature" \
  name="My Feature" \
  tag="my-feature" \
  uri="my-feature"
```

This generates the component package under `packages/widgets/account/my-feature/`, creates a `component.json` manifest, and wires up the Vite build config.

---

## Media Service

A lightweight **Go** microservice (`services/media/`) that handles file uploads and deletions. It runs behind Negroni middleware and exposes three endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health-check` | Liveness check |
| `POST` | `/upload-image` | Upload an image to persistent storage |
| `POST` | `/delete-image` | Delete a stored image |

Media files are persisted to `services/media/storage/` via a Docker volume.

---

## Make Commands

| Command | Description |
|---|---|
| `make run` | Build and start all Docker containers |
| `make stop` | Stop all containers |
| `make kill-db` | Destroy the MySQL data volume |
| `make ssh` | Open a shell inside the app container |
| `make refresh-composer` | Run `composer update` + dump autoload inside the container |
| `make unit` | Run the full PHPUnit test suite |
| `make unit-class {path}` | Run a single test file (path relative to `tests/`) |
| `make ui-build` | Compile all frontend packages once |
| `make ui-watch` | Compile frontend packages in watch mode |
| `make ui-deploy` | Sync the component registry to the database |
| `make ui-full-deploy` | Build all packages, rebuild the registry, then sync to the database |
| `make ui-component location=… name=… tag=… uri=…` | Scaffold a new Lit web component |

---

## Running Unit Tests

```bash
# Run all tests
make unit

# Run a single test file
make unit-class UnitTests/Application/Helper/BaseControllerTest.php
```

For IDE integration (PHPStorm, etc.):
- **Configuration file:** `tests/phpunit.xml.dist`
- **Bootstrap file:** `src/app/bootstrap.php`

