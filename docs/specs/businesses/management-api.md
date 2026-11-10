---
type: feature
---
# Business management APIs isolate tenants and return stable errors

## Why
Signed-in users need to manage their own businesses, locations, and employees without exposing or modifying another user's business data.

## Where it lives
- `apps/web/app/api/Business/` — authenticated HTTP route handlers.
- `packages/domain/src/schemas/` — request validation.
- `packages/domain/src/queries/` — tenant-scoped database operations.
- `packages/db/prisma/` — the schema and append-only SQL migrations.
- `tests/integration/` — database and API regression coverage.

## Behavior
- Every business, location, and employee operation derives the current user from the session and scopes the database query through that user's active employee membership.
- Listing or creating locations under an unknown or foreign business returns 404 without confirming whether the business exists.
- Creating an employee under an unknown or foreign business returns 404.
- Owners and managers can create employees; staff receive 403 because the business is known to them but their role does not permit the action.
- Creating an employee resolves the employee's login account by the submitted email, creating that account when it does not exist; it never assigns the caller's account to the new employee.
- Duplicate location details or employee membership within a business return the standard 409 error shape; business names and contact details may repeat because the schema does not make them unique.
- Invalid JSON and validation failures return the standard 400 error shape, and unexpected database errors return a generic 500 error without exposing raw details.
- POST /api/Business is developer-only, requires a matching Origin, and accepts the provisioning schema including owner_email and description. Its no-store 201 response contains the business and one-time credential handoff. Owners receive 404. See developer-provisioning.md.
- Business creation, owner account, owner membership, and developer grants remain transactional.
- A fresh database applies every SQL migration and matches the active Prisma schema closely enough for all modeled reads and writes to succeed.

## Examples

| State / input | Behavior |
|---|---|
| Owner creates a location in their business | 201 with the created location |
| User requests locations from another user's business | 404 with `{ error: { code, message } }` |
| Manager adds a new employee | Login account and employee membership are created atomically; 201 returned |
| Staff member attempts to add an employee | 403 with `{ error: { code, message } }` |
| Location name already exists in that business | 409 with `{ error: { code, message } }` |
| Fresh in-memory database applies migrations | Migration replay completes and Prisma can read every modeled table |

## Verify
- Run `pnpm test`, which includes package and integration tests.
- Run `pnpm typecheck` and `pnpm build`.
- Start a disposable web instance with `PGLITE_DATA_DIR=memory://`, then run `pnpm verify:api` (`API_BASE_URL` selects the instance; defaults to `http://127.0.0.1:3000`). With DEVELOPER_EMAIL and DEVELOPER_PASSWORD supplied for a disposable provisioned developer, the drill provisions and activates two owners using real cookies and confirms their business IDs return 404 from the other user's session, checks duplicate 409s and owner provisioning denial; staff role enforcement is verified in integration tests. It creates test users and rows; do not point it at production.

## Constraints & decisions
- Foreign resources return 404, while insufficient role within a known business returns 403, following `docs/specs/web.md`.
- Employee contact details do not provision credentials. Only explicit developer provisioning creates an owner login; legacy matching emails do not claim accounts.
- Identity comes from a persisted, unexpired regular session. Activation-only tickets cannot access the business APIs.
- Employee contact emails and login emails are normalized, but contact records alone do not grant login access.
- The login page accepts email and password.
- Migration history remains append-only; corrective SQL is added as a new migration and existing migration files are not edited.
- The missing `0003` transition runs before `0004` under the filename-ordered runner, including when later migrations are already recorded; enum conversions reject unknown values, lookup history is preserved in the `legacy` schema, and inconsistent payment customer references abort the migration.
- Prisma remains on the pinned v6 release during this repair because a major-version upgrade is a separate compatibility decision.
- Prisma uses the adapter-based JavaScript engine so Windows ARM64 does not load an incompatible x64 query-engine library; Postgres and PGlite use their existing adapters.
- The generated client is loaded with Node's native module loader and included in Next.js file tracing so its WebAssembly compiler resolves from the generated directory in built deployments.
- Database client initialization and its resolved instance are shared across page/action and API module runtimes in every environment; concurrent initialization does not open duplicate clients.
- Database client generation is a dependency of build, test, and typecheck through the database package's build task.

## Out of scope
- Invitations, email verification, password authentication, and OAuth are owned by `docs/specs/auth.md`.
- Employee updates, deletion, and role changes are not implemented by this API.
- Customer, appointment, service, payment, task, note, and interaction endpoints are not introduced here.
