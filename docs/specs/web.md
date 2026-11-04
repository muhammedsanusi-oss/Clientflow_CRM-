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

- The existing / dashboard is for developers. Owners visiting it redirect to /customers; signed-out requests redirect to /login.
- The dashboard shows businesses authorized by the current developer's access grants, plus owner email and activation status. Its existing visual layout remains in place.
- Create business opens /businesses/new. Business cards open /businesses/<id> for provisioning details. See [business creation](businesses/create-business.md).
- Owners access the existing customer and calendar pages through active business membership. The owner customer page identifies the business by name and description.
- Activation-only sessions cannot access CRM data. Login routes them to /change-password until they finish setup.
- Customer and calendar pages and actions check identity before accessing tenant data.
- Signing out uses the same-origin logout endpoint and revokes the persisted session.
- Development uses the standard Next.js bundler; business forms support Server Action POST submissions and client navigation.

## Public business websites

- /sites/<businessId> renders the saved Bakery, Barbershop, Salon, or Contact template without a session, using only explicitly public business fields. Businesses without website settings return 404.
- The contact form posts to /api/sites/<businessId>/contact and persists business-bound inquiries; it does not send email or create CRM customers.
- The owner's /inquiries page is private and scopes messages to an active OWNER membership. The owner workspace links to its website and inbox.
- Developer business cards and creation confirmation include Open website for configured sites. Preview dialogs use unsaved form details and never submit real messages.
- The root sign-out control remains available to signed-in visitors; website content exposes no session identity or private owner information.

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
