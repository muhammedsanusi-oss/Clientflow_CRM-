---
type: feature
---
# Demo subscriptions control website and CRM access

This feature covers plan enforcement and simulated subscriptions.
Other demo workflows are separate increments.

## Why

Visitors can demonstrate selecting a service, checking out, renewing, failing
a payment, changing plans, and cancelling without paying money or connecting
an external billing provider. The selected active service actually controls
access to the website editor and CRM.

## Where it lives

- `apps/web/app/signup/`: selection and post-signup demo checkout destination.
- `apps/web/app/subscription/`: private subscription summary, simulated checkout,
  plan changes, renewal/failure/cancellation controls, and event history.
- `apps/web/app/api/`: authenticated, same-origin subscription actions.
- Owner workspace navigation and entry routes: subscription access and
  destinations appropriate to the selected service.
- `packages/domain/`: subscription validation, transactional transitions,
  server-owned prices, and shared entitlement predicates.
- Website editing, CRM queries/actions/APIs, and public booking: entitlement
  enforcement alongside existing membership and developer-grant checks.
- `packages/db/prisma/`: additive subscription and history models/migration.
- Integration tests and a demo runbook: lifecycle, access, and recovery drills.

## Behavior

- All billing screens state Demo: no real charges. No card numbers, bank
  details, payment credentials, or payment-provider account are requested.
- The offerings are Standard website ($39/month), Website + standard CRM
  ($79/month), and Managed service ($149/month). Tailored work continues through
  consultation and developer provisioning, not automatic checkout.
- Standard provides owner website editing. CRM and Managed also provide
  customers, appointments, booking availability, calendar, services, and notes.
  Managed also includes content-change requests and 30 tracked developer minutes
  per UTC calendar month; see [managed service](managed-service.md).
- Signup creates the owner, business, membership, selected pending demo
  subscription, and initial history atomically, then opens demo checkout.
  A successful simulated payment activates the selected service for one month.
  A failed simulated payment marks it past due without granting paid access.
- New subscription records use explicit service names; existing website-plan
  image/section/request limits remain in effect. This increment does not
  change the stored website-content limits or implement custom-development entitlements.
- Existing businesses without a demo subscription retain their existing
  behavior and stored records. They are labeled legacy demo access, not paid
  subscribers. An owner can explicitly enroll one through the subscription page.
- The local preview websites are explicitly enrolled through
  `scripts/preview-demo-subscriptions.ts`, using simulated successful payment
  and examples of all three services. This is a development-data operation,
  not an automatic migration of other businesses. Dashboard cards show their
  demo service, price, and status. The fixed Sample business is initialized
  with CRM demo access; subsequent logins do not reset its subscription.
- A signed-in active OWNER member manages their business's subscription. A
  developer may manage it only with an explicit business grant. Staff,
  unrelated users, and unknown businesses receive 404. No submitted user ID
  establishes identity or permission.
- The subscription page permits simulated checkout, successful renewal, failed
  payment, immediate plan change after simulated successful payment, and
  immediate cancellation. Every destructive-looking control explicitly says
  simulated or demo; no CRM or website record is deleted.
- Renewal extends the existing paid-through date by one calendar month; when
  the prior period has expired, a successful payment starts a new month from
  the current server time. Calendar-month arithmetic clamps month-end dates.
  Successful same-plan recovery preserves any future paid-through time; a
  successful plan change starts a new month immediately without proration.
- Failed payment or cancellation blocks subscription-controlled owner editing
  and CRM access. Successful simulated payment restores access according to
  the plan. Expired active subscriptions grant no paid access until renewed.
- Server-derived membership/grants and entitlement predicates protect direct
  API, action, and domain calls as well as navigation. Hiding a link alone is
  never the access boundary. Public booking is unavailable without an active
  CRM-capable subscription, except for legacy businesses retaining prior access.
- Previously published public website content remains readable when a demo
  subscription is inactive. Cancellation does not erase or silently unpublish
  content. Developer provisioning/editor access retains its explicit grants.
- Standard owners enter their website workspace, CRM/Managed owners enter the
  calendar, and pending/inactive owners enter subscription checkout. Owners
  always retain access to subscription management to recover their service.
- Prices, currency (USD), dates, and access come from the server. An action
  accepts only the business, allowed scenario/plan, and expected subscription
  version. Stale or competing actions return 409 without duplicate history.
- Each transition and its before/after history commit in one transaction.
  History shows the actor, simulated event, service/price, dates, and result;
  it never represents a real receipt or invoice. Unknown errors use the
  existing safe envelope; malformed input returns 400.

## Examples

| State / input | Behavior |
|---|---|
| New owner selects Standard and simulates successful checkout | Website editing works; direct CRM calls are denied |
| Standard owner simulates a successful upgrade to CRM | Existing data is preserved and CRM access becomes available |
| CRM owner simulates a failed payment | Paid access stops; subscription controls and recovery remain available |
| Owner simulates successful recovery | Appropriate access returns and one history event is recorded |
| Owner cancels the demo subscription | Paid access stops; published content and private stored records remain |
| Business has no subscription record from before this feature | Existing access remains until explicit demo enrollment |
| User submits another business's ID | 404 and no subscription/history change |
| Two actions submit the same version | One succeeds; the other returns 409 without a second transition |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Migration tests verify existing businesses and records survive without
  subscription rows or automatic charges/status changes.
- Integration tests cover signup/checkout atomicity, all transitions, stale
  versions, concurrent claims, safe error envelopes, and owner/developer access.
- Assert website/CRM restrictions using direct domain functions and HTTP
  handlers, including public booking and a foreign or inactive membership.
- Assert legacy behavior and previously created data remain intact through
  enrollment, downgrade, failed payment, cancellation, and recovery.
- Test period expiry and month-end renewal with a controlled clock.
- Run `pnpm exec vitest run tests/integration/demo-subscriptions.test.ts` as
  described in `docs/runbooks/demo-subscriptions.md` on disposable data: Standard checkout, blocked
  CRM access, upgrade, failed payment, recovery, cancellation, and preserved data.

## Constraints & decisions

- No dependency, external service, or real payment integration is added.
- Legacy compatibility avoids converting existing examples and customer data
  into subscriptions without an explicit enrollment action.
- Billing status is separate from login identity, website publication, and
  employee activation. No subscription action revokes ownership or deletes data.
- This demo has no grace period, proration, taxes, refunds, invoicing, automatic
  background charging, or scheduler. Renewal/failure controls are explicit
  simulations, and expiry is checked when access is requested.
- Existing local-only signup and production verification restrictions remain.
- Existing accepted ADRs and applied migrations remain unchanged.

## Out of scope

- Managed-service fulfillment is governed by [managed service](managed-service.md).
- Local email inbox, email verification/recovery delivery, or automatic messages.
- Tailored-project quotes, approvals, development tracking, and handoff changes.
- New hosting deployments, DNS/certificate automation, or backup infrastructure.
- Stripe or other payment providers, actual subscriptions, or real charges.
