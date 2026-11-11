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

- The / homepage is role-aware: developers see the developer dashboard, business owners go to `/owner` and then the newest business workspace according to its demo subscription, and signed-out requests redirect to /login.
- The dashboard shows only businesses with a configured Clientflow website
  authorized by the current developer's access grants. Cards and totals exclude
  website-less businesses, including examples. Account activation is labeled
  Owner access, separately from website availability; stored business records
  remain intact. See [website-backed directory](businesses/website-backed-directory.md).
- Set up client portal opens /businesses/new. Each tailored request offers
  Set up portal with its private owner details prefilled for developer review.
  Business cards open /businesses/<id> for provisioning details. See
  [business creation](businesses/create-business.md).
- `/owner` is the owner entry route. It selects the newest business with an active OWNER membership and opens its editor (Standard), calendar (CRM/Managed or legacy), or subscription recovery (inactive); if no business is linked, it shows an access-help message. Owners can navigate the workspace from the selected business's themed navigation.
- Local development exposes the owner website signup at `/signup`; it skips email verification for demos and creates an owner account, one business, billing details, and membership together. Other runtimes return 404 until production email verification is implemented. See [owner self-service signup](businesses/owner-self-service-signup.md).
- Signup offers standard templates or a tailored website/CRM consultation with
  contact details and preferred callback time. Tailored requests create no
  account until a developer provisions it; the developer shares a password-setup
  link and the owner sets a password before portal access. Sign-in has no
  standalone custom-request link. See [tailored signup](businesses/custom-website-signup.md).
- Owners access customer and calendar pages through active business membership. The owner customer page identifies the business by name and description.
- Activation-only sessions cannot access CRM data. Login routes them to /change-password until they finish setup.
- Customer and calendar pages and actions check identity before accessing tenant data.
- Signing out uses the same-origin logout endpoint and revokes the persisted session.
- Developer dashboard and owner workspace headers reserve space below the
  fixed subscription/sign-out bar. Owner navigation wraps within the viewport
  so its last button remains visible at desktop, mobile, and enlarged browser
  zoom sizes.
- Development uses the standard Next.js bundler; business forms support Server Action POST submissions and client navigation.

## Public business websites

- /sites/<businessId> renders the saved Bakery, Barbershop, Salon, or Contact template without a session, using only explicitly public business fields. Businesses without website settings return 404.
- The contact form posts to /api/sites/<businessId>/contact and persists business-bound inquiries; it does not send email or create CRM customers.
- The owner's /inquiries page is private and scopes messages to an active OWNER membership. The owner workspace links to its website and inbox.
- Developers receive in-app notifications for business inquiries and owner website-change requests, with business details available only through an explicit developer grant. Prospects can submit custom CRM requests without creating an account; developer notifications also include authenticated external-monitor status transitions. See [developer notifications](notifications/developer-notifications.md).
- Developer business cards and creation confirmation include Open website for configured sites. Preview dialogs use unsaved form details and never submit real messages.
- Configured developer business cards and detail pages also link to `/businesses/<id>/website`. Reads and publication require the current developer's explicit business grant. Supported website edits and revision history are saved atomically; stale publications return a conflict. See [website editing](businesses/website-editing.md).
- Active owners access `/website?businessId=<id>` through their business portal to view published website content and its publication time. This private view is read-only; customization charges are manually agreed outside the app.
- The root sign-out control remains available to signed-in visitors; website content exposes no session identity or private owner information.

## Async honesty (UI standard)

- The app-level route-loading UI displays an accessible "Loading page..." message and a page-shaped skeleton while a destination page resolves. Route-specific loading UIs remain in place for their routes; this fallback covers routes without a more specific loading UI.
- The shared session-aware header resolves behind its own Suspense boundary so session lookup does not block the route-loading UI.
- This page-loading indicator covers route loads and navigation, not in-place form submissions or save actions.
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

Demo checkout, subscription recovery, server-side plan enforcement, and legacy
access are specified in [demo subscriptions](businesses/demo-subscriptions.md).
Published websites remain readable without an active demo subscription.

Managed owners request content changes at `/managed-service`; granted developers
fulfill them at `/businesses/[id]/managed-service`. Subscription management links
to current allowance and retained history. See [managed service](businesses/managed-service.md).
