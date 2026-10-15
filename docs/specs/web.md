---
type: infrastructure
---
# Web app — shell, health, and server standards

The Next.js app (`apps/web/`) carries three cross-cutting contracts that hold
on every branch, for every feature.

## Health endpoint

- `GET /api/health` returns `{ status: "ok", db: "ok" }` when the process and
  its database connection are healthy; 503 with `db: "error"` when not.
- **Unauthenticated and dependency-light, forever** — probes must never be
  blocked by the thing they're probing. Deploy probes, uptime checks, and the
  "stop the database and watch" demo all point here.

## Workspace homepage

- The homepage links to `/customers`, `/customers/new`, and `/calendar`.
- `Create business` opens `/businesses/new` from the dashboard directory and zero-business state. Business cards open `/customers?businessId=<id>`; creation and customer linking follow `docs/specs/businesses/create-business.md`.
- Customer and calendar pages and server actions redirect signed-out users to `/login` before querying or writing tenant data.
- Development uses the standard Next.js bundler (`next dev`); the customer forms must support server-action POST submissions as well as client navigation.

- `/` requires a current user and redirects signed-out or stale identities to
  `/login`.
- The overview shows the current user's username and businesses returned by
  the user-scoped business query; it does not trust client-supplied user IDs.
- The business directory shows an explicit empty state when the user has no
  businesses.
- Signing out uses the logout endpoint and returns the user to `/login`.

## Async honesty (UI standard)

- Every async region has three states: loading (skeleton), empty (with a
  primary action), error (retry card that refetches). Sections stream in their
  own Suspense boundaries — no full-page spinners.
- Quick actions apply optimistically and roll back with an explanatory toast.
- Errors surface; they are never silently swallowed.

## Server entry standard (the ritual)

Every route handler and Server Action, in order:
1. derive identity (see [auth](auth.md)) →
2. validate with the shared Zod schema (`packages/domain`) →
3. query scoped by the derived user →
4. act →
5. map errors →
6. revalidate.

- One error shape everywhere: `{ error: { code, message } }` with
  400 validation / 401 no session / 403 not permitted / 404 absent-or-foreign
  / 409 conflict. Prisma mapped: P2002→409, P2025→404.
- **Foreign resources return 404, not 403** — existence is not confirmed to
  non-owners.
- Raw errors and stack traces never reach a client.

## Verify

- The integration suite exercises one happy + one sad path per endpoint.
- `curl` the health endpoint with the db up and down.

## Key decisions

- [ADR-0003](../adr/0003-dev-identity-stub.md) — identity stub + production guard.
- [ADR-0009](../adr/0009-domain-web-only.md) — schemas/queries live in `packages/domain`.
