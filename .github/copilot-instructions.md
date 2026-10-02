# Copilot instructions

Read [`AGENTS.md`](../AGENTS.md) first; it is the canonical repo-wide guide. Then
follow [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the issue → spec → PR workflow
and check the relevant package README or `docs/specs/` page before changing
behavior.

## Build, test, and lint commands

Use `pnpm` from the repository root. This repo does not define a root lint script;
CI and local validation are the standard `pnpm test`, `pnpm typecheck`, and
`pnpm build` checks.

```bash
pnpm install
pnpm dev                 # web + worker + local Postgres + Azurite
pnpm test                # turborepo unit test run
pnpm test:integration    # Vitest integration suite
pnpm typecheck
pnpm build
pnpm prisma:generate
pnpm db:migrate
pnpm db:reset            # removes .pgdata; restart pnpm dev to rebuild DB
pnpm db:dev              # local Postgres server only
pnpm dev:web             # web app only
pnpm worker              # worker only
pnpm azurite             # Azure storage emulator only
```

Single-test examples:

```bash
pnpm test:integration -- tests/integration/smoke.test.ts
pnpm --filter @project/web test -- src/app/api/health/route.test.ts
pnpm --filter @project/domain test -- tests/todo-schema.test.ts
```

## High-level architecture

- This is a pnpm/Turborepo monorepo. `apps/` holds deployable services and
  `packages/` holds shared libraries; do not import from one app into another.
- The app stack is: `apps/web` (Next.js UI), `apps/worker` (background job
  consumer), `apps/db-server` (local Postgres), and `apps/migrate` (migration/
  seed runner).
- Shared libraries are intentionally split by concern:
  - `packages/db`: Prisma schema, client, migration tooling
  - `packages/services`: Azure/seam-based adapters for queue, storage, and
    notifications
  - `packages/domain`: Zod validation and shared query logic intended for web use
  - `packages/log`: logger
  - `packages/auth`: dev identity stub
- Local development runs a real Postgres server and Azurite emulator; production
  adapters are selected by config rather than branching on environment. The seam
  pattern is the repo's core architectural idea.
- The request flow is "derive identity → validate input → perform user-scoped
  domain logic → access DB through Prisma". Route handlers and Server Actions own
  HTTP/UI concerns such as redirects, revalidation, and user-facing error mapping.
- Every data access path is scoped to the current user and active business context.
  Never trust client-supplied user, business, or location IDs as authorization.
  Foreign or unknown resources should resolve as 404, not 403.

## Key conventions

- Follow the repo's issue → spec → implementation → PR workflow. Behavior changes
  should update the matching evergreen spec in `docs/specs/` in the same PR.
- `AGENTS.md`, `README.md`, and `docs/README.md` are the canonical references for
  architecture and operating rules.
- Migrations are append-only. Never edit an applied migration; add a new SQL file.
- Prisma schema changes require `pnpm prisma:generate`.
- Respect soft-delete semantics where `deletedAt` exists; default reads exclude
  deleted rows.
- Writes that imply a history event must persist both pieces atomically in one
  transaction.
- Route and API handlers should return the repo's single error shape:
  `{ error: { code, message } }`; do not expose raw exceptions or stack traces.
- Keep validation and domain queries in `packages/domain`; avoid duplicating request
  definitions across app and worker code.
- Prefer the existing seams and adapter interfaces instead of introducing
  environment-specific branching in consumers.
- The `@project` workspace scope is a placeholder; do not hardcode it in new code.
- Do not edit `.pgdata/`, `.azurite/`, or `.env` files.
- If a change touches the database model, check both the Prisma schema and the
  migration files before editing anything.

## Documentation and review expectations

- The docs system is the source of truth for architecture and project workflow.
  Read `docs/specs/` plus the relevant package README before implementing new
  behavior.
- Specs are evergreen and should be updated when behavior changes. ADRs are
  write-once decisions; postmortems and runbooks are also kept in the repo's
  documentation system.
- Before declaring work done, run the repo's required checks: `pnpm test`,
  `pnpm typecheck`, and `pnpm build` as applicable for the change.
