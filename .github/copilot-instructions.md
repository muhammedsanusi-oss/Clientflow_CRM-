# Copilot instructions

Read [`AGENTS.md`](../AGENTS.md) first; it is the canonical repository-wide
guide. Follow [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the issue → reviewed
spec → implementation workflow. Check the relevant `docs/specs/` and package
README before changing behavior.

## Commands

Run commands from the repository root with `pnpm`:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm prisma:generate # after changing the Prisma schema
```

Tests do not need external services: integration tests use in-memory PGlite.
To run one test file:

```bash
pnpm test:integration -- tests/integration/smoke.test.ts
pnpm --filter @project/services test -- tests/queue.test.ts
```

`pnpm test` runs workspace test scripts through Turborepo; `pnpm test:integration`
runs the root Vitest integration suite. PGlite does not support `pg_notify`;
SSE tests need a real PostgreSQL connection or a mock. There is no root lint
script.

## Architecture

- This is a pnpm/Turborepo monorepo. `apps/` contains deployable processes;
  `packages/` contains shared libraries. Apps must not import from other apps.
  Shared code belongs in a package. `packages/domain` is web-only; the worker
  must not depend on it. Put shared web validation and query functions there
  and export them from `src/index.ts`; check that exports actually exist before
  importing a feature API.
- The customer feature spec defines `Business` as the tenant boundary and
  `Location` as a branch; customers are shared across a business's locations.
  Before customer/data-model work, compare that contract with the current
  Prisma schema and migrations rather than assuming the model is already
  implemented. Derive tenant access through the current user's active employee
  relationship; do not make customers location-owned.
- The web request path is: derive identity with `@project/auth`, validate input
  with Zod schemas in `@project/domain`, perform user-scoped domain queries,
  then use `@project/db` for Prisma access. Route handlers and Server Actions
  own HTTP/UI concerns such as error mapping, redirects, and revalidation.
- Next.js API endpoints use the App Router convention under
  `apps/web/app/api/`: each URL segment is a directory and its `route.ts`
  exports the supported HTTP method handlers.
- The current auth package is a guarded development identity stub, not
  production authentication (it reads a request header, environment value, or
  fallback). Check `docs/specs/auth.md` before changing identity behavior;
  never trust client-provided IDs as authorization.
- Business data is tenant-scoped. Derive the business from the current user's
  active employee relationship; never accept a client-supplied user or
  business ID as authority. Foreign or unknown resources return 404, not 403.
- The web app enqueues work through `@project/services`; the standalone worker
  consumes queue messages and uses shared packages to process them. Keep the
  producer/consumer message contract compatible.
- External dependencies use local/production seams: tests use PGlite, local
  development uses the embedded Postgres server and Azurite, and production
  adapters are selected by environment configuration. Preserve the adapter
  interfaces rather than adding environment-specific branches to consumers.

## Repository-specific conventions

- For every route handler or Server Action, follow this order: derive identity,
  validate with the shared schema, query scoped to that identity, perform the
  operation, map errors, then revalidate as needed. API errors use
  `{ error: { code, message } }`; raw errors and stack traces never reach users.
- If a write implies a history event, persist both in one transaction. Respect
  `deletedAt` with soft deletes and exclude deleted rows from default reads.
- Async UI regions provide loading, empty, and recoverable error states;
  independent sections should stream through their own Suspense boundaries.
- Prisma schema changes require `pnpm prisma:generate`. Migrations are
  append-only; do not edit an applied migration.
- A behavior change updates its evergreen spec in `docs/specs/` in the same
  change. Specs contain no issue numbers, PR links, or dates. Follow the
  feature/infrastructure templates and verify the spec's Verify steps.
- `@project` is a placeholder workspace scope; do not hardcode it in new code.
- Never edit `.pgdata/`, `.azurite/`, or `.env`.
