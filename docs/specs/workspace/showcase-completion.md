---
type: feature
---
# Owners complete a website-to-booking showcase using existing tools

## Why

A presenter can create a demo business, publish its website, configure booking,
and show a visitor's appointment in the owner's CRM without terminal data fixes.
The demo uses local accounts and simulated subscriptions throughout.

## Where it lives

- `apps/web/app/calendar/locations/`: owner location setup using existing models.
- `apps/web/app/owner/` and `apps/web/app/calendar/`: booking setup links.
- `packages/domain/`: validated owner location access and booking readiness.
- `apps/web/components/business-sites/`: eligible public booking links.
- `apps/web/app/businesses/[id]/website/`: unpublished edit status and exit warning.
- `tests/integration/` and `tests/browser/`: workflow and isolation checks.
- `docs/runbooks/project-walkthrough.md`: repeatable showcase script.

## Behavior

- An active CRM-capable owner can create a location with name, address, and
  optional contact details from scheduling settings. Existing locations are
  listed; creating a new business does not invent a physical address.
- Location validation and writes live in the domain layer. The authenticated
  owner's active membership and existing CRM entitlement are checked on the
  server. Signed-out pages redirect to login; foreign, unknown, inactive, and
  ineligible resources return 404. Duplicate locations show a useful error.
- The owner can follow links to locations, services, and hours from the calendar
  and dashboard. Missing booking prerequisites are explained with setup links.
- Public sites offer booking only when the business has an active location,
  active service, opening hours, and CRM-capable access (including existing
  legacy access). Otherwise their contact action remains usable. Public booking
  APIs continue to enforce availability independently of navigation.
- The website editor identifies unpublished changes and warns before a browser
  refresh/close or ordinary in-app link departure. Successful publication marks
  the current saved draft clean; failed publication preserves the draft.
- No customer data, published content, credentials, or subscription states are
  reset by opening a screen. All charges remain explicitly simulated.

## Examples

| State / input | Behavior |
|---|---|
| Newly created CRM business has no location | Owner sees the location setup action and can add its address |
| Owner submits another business ID | 404, with no location created |
| Standard website has no CRM access | Public contact action remains; no broken booking CTA |
| Ready CRM business receives a public booking | Appointment appears only in its owner's calendar |
| Editor has unpublished changes and owner follows a link | Owner can cancel departure and retain the draft |
| Publish fails or conflicts | Changes stay visible and unpublished |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Integration checks cover location validation, duplicate handling, owner/plan
  isolation, and public booking readiness without exposing private records.
- Use a disposable local instance to create an owner/business, simulate CRM
  checkout, configure a location/service/hours, publish, and book a future slot;
  confirm the appointment and customer in the same owner's workspace.
- Exercise setup and booking at desktop and 390px using keyboard controls.
- Change editor text, cancel departure, publish, and leave without a warning;
  verify rejected publication retains dirty status.

## Constraints & decisions

- Reuse the existing Next.js, Prisma, domain validation, templates, and test
  tools. No new dependency, paid service, schema change, or real payment.
- Existing authentication, tenant boundaries, public projections, subscription
  semantics, and append-only migration contracts remain authoritative.
- Location deletion, staff login accounts, and arbitrary website code are not
  needed to present the existing end-to-end workflow.

## Out of scope

- Production accounts, email delivery/recovery, hosting, domains, real billing,
  backups, ecommerce, and external calendar synchronization.
- New website templates, a replacement editor, mobile agenda, and new color
  controls. Existing website-editing and booking specs own those workflows.
