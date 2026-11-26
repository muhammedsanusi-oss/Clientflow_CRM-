---
type: feature
---
# Business owners enter a dedicated dashboard

## Why

Owners have one home for their business, with website, customer/scheduling, and
account/support tools grouped clearly. Return links consistently open this home
instead of dropping owners into a calendar, subscription screen, or customer list.

## Where it lives

- `apps/web/app/owner/`: owner dashboard and responsive presentation.
- `apps/web/components/owner-workspace.tsx`: compact owner navigation.
- `packages/domain/src/subscription-access.ts`: owner home destination helper.
- Website editor, preview, inquiries, and subscription pages: return links.
- `packages/domain/src/websites.ts`: existing owner-scoped business listing.

## Behavior

- `/owner?businessId=...` renders the selected owner's dashboard. Without an ID,
  it selects the most recently created authorized business. A business switcher
  lists only active OWNER memberships, including businesses with inactive plans.
- Signed-out visitors reach login. Developers return to their developer home;
  missing, foreign, or repeated business IDs return 404. Owners without a business
  see a helpful no-workspace state.
- The dashboard and website editor stay accessible with a canceled, expired, or pending plan.
  It displays the real subscription state and explains restricted tools, with a
  subscription-management action. It never silently activates a subscription.
- Website tools always include edit and published preview for a configured
  website, regardless of subscription. Inquiries retain their existing access.
  CRM tools group customers, notes, appointments, services, and hours/staff.
  Account/support groups demo subscription and eligible managed-service requests.
  No fabricated counts or analytics appear.
- Tools requiring unavailable entitlements show explanations and a relevant
  subscription action instead of broken links. Existing server authorization
  remains authoritative. Missing website configuration has an explicit message.
- The owner workspace header is compact: business identity, current destination,
  and a dashboard link replace the mixed collection of tool buttons. The dashboard
  organizes the destinations. Existing owner themes remain readable on mobile.
- Back to business portal/dashboard links from the website editor, published
  preview, and inquiries open the selected dashboard. The subscription return
  button does the same for all owner plan states. Developers keep their existing
  business-details destination and cannot enter the owner role.
- The owner home destination helper resolves to this dashboard for all plans.
  Dashboard rendering performs reads only and uses existing business data.
- With CRM eligibility, Scheduling also shows the next five non-canceled
  appointments starting today, with customer, service, location, and local date/
  time and a link to their calendar month. Refresh shows new public bookings.
- Bakery websites have a Bakery shop group linking to Products, Delivery
  settings, and Customer orders in every subscription billing state. Those
  pages independently verify active owner membership. Catalog, checkout, and
  order progress follow `bakery-orders.md`.

## Examples

| State / input | Behavior |
|---|---|
| CRM owner returns from subscription | Selected business dashboard with available CRM tools |
| Canceled owner returns from preview | Same dashboard with website editing, paid restrictions explained, subscription action available |
| Standard owner opens dashboard | Website tools available; CRM section explains the plan requirement |
| Owner with two businesses selects the second | Dashboard and tool links retain the second business ID |
| Foreign business ID | 404; no business details disclosed |
| Developer uses subscription return button | Business details, without account switching |

## Verify

- `pnpm exec vitest run tests/integration/owner-dashboard.test.ts
  tests/integration/subscription-navigation.test.ts` checks grouped tools,
  selected-business returns, plan restrictions, and missing/foreign businesses.
- With the local demo app and isolated Chromium on port 9391, run
  `pnpm exec node tests/browser/owner-dashboard.mjs` and
  `pnpm exec node tests/browser/subscription-navigation.mjs`. These checks do not
  change subscriptions or published content. Review screenshots under
  `artifacts/owner-dashboard/`.
- Run targeted dashboard rendering/navigation tests for all plan states, missing
  and foreign businesses, and selected-business routes. Run the browser return
  drill for developer and owner accounts without changing their subscriptions.
- Check desktop, 390px, keyboard navigation, long names, and dark/light owner
  themes. Confirm unavailable tools cannot be entered through dashboard links.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`; report pre-existing blockers.

## Constraints & decisions

- Reuse the existing owner route, role checks, memberships, and entitlement
  helpers. No new dependencies, schema changes, analytics, or permissions.
- The dashboard is an organizing layer for existing tools. Location management
  and booking setup improvements remain separate reviewed work.

## Out of scope

- Developer dashboard redesign, new billing behavior, location CRUD UI, or
  changing publishing semantics and public website designs.
