---
type: feature
---
# Developers create businesses and owners use their assigned workspace

## Why

The project developers prepare business portals for owners. Owners manage customers in their assigned business without creating or claiming other businesses.

## Where it lives

- apps/web/app/page.tsx: existing developer dashboard and business directory.
- apps/web/app/businesses/new/: existing form extended with description and owner login email.
- apps/web/app/businesses/[id]/: developer-only business handoff and pending-password regeneration.
- packages/domain/src/provisioning.ts: validation, developer grants, and transactional provisioning.
- packages/domain/src/customers.ts and appointments.ts: membership-scoped customer and appointment access.
- tests/integration/: provisioning and tenant isolation regression checks.

## Behavior

- The existing dashboard layout remains the developer portal. Owners visiting / redirect to /owner.
- Create business collects business name, type, description, contact email and phone, owner first/last names, and owner login email. Only developers may provision businesses.
- Provisioning creates the owner account, business, OWNER membership, and both developers' access grants atomically. Developers do not become employee owners.
- The form includes Bakery, Barbershop, Salon, and Contact templates, a live preview dialog, and Use sample details. Creation saves the website settings and contact information; see [website templates](website-templates.md).
- The success screen displays the temporary owner password once and an Open website link rather than redirecting the developer into the CRM. Business cards open developer-only provisioning details. Full credential and activation behavior is defined in [developer provisioning](developer-provisioning.md).
- Owners sign in with email and temporary password, replace it, and then open their business customer list. The portal displays its business name and description.
- Local development also includes a separate self-service owner demo signup. It skips email verification only in development; production signup remains disabled. See [owner self-service signup](owner-self-service-signup.md).
- CRM queries select only active employee memberships. The business selector, when several memberships exist, selects a resource, not authorization.
- Customer creation preserves the authorized business selection and writes the customer with that business relationship. Unknown or foreign business IDs return 404.
- Notes and scheduling resolve the employee membership in the customer's business; existing customers keep their business relationship.
- The calendar keeps its existing scope across accessible memberships; no new calendar filter is introduced.
- Signed-out or activation-only requests cannot create businesses or access CRM data. Pages redirect to /login; private APIs return 401. The login page sends activation sessions to password replacement.
- Form validation preserves safe inputs, identifies field errors, and disables submission while pending. Failures expose only the standard safe error shape.

## Examples

| State / input | Behavior |
|---|---|
| Developer submits valid business and new owner details | Atomic provisioning; one-time credential handoff screen |
| Owner submits business creation | Denied; no business created |
| Blank business name or invalid email | Field errors; no provisioning writes |
| Provisioning transaction fails | Business, account, membership and grants roll back |
| Owner selects an authorized business | Customers are read and created within that business |
| Owner supplies another business ID | 404; no data disclosed |
| Developer opens a provisioned business card | Description, contact details and owner activation state |

## Verify

- Run pnpm test, pnpm typecheck, and pnpm build.
- On a disposable app with an explicitly provisioned developer, set DEVELOPER_EMAIL and DEVELOPER_PASSWORD in the process environment, then run node tests/http/business-onboarding.mjs. API_BASE_URL selects the app.
- The drill verifies developer dashboard/form fields, owner activation, required password replacement, owner portal access, business isolation, and logout replay protection. It creates synthetic accounts and businesses.
- Integration tests verify selected-business customer writes, note and appointment membership resolution, field validation, provisioning rollback, and foreign-resource 404s.
- Complete form entry and credential handoff using the keyboard when a browser is available; report unavailable manual checks.

## Constraints & decisions

Reuse the dashboard, current visual style, existing business types and CRM workflows. Add schema changes in append-only migration 0006_owner_provisioning.sql. Developer grants authorize provisioning records separately from employee memberships. Owner email never claims or resets a legacy account. See ADR-0014 and [authentication](../auth.md).

## Out of scope

Business editing/deletion, customer transfers, staff invitations, custom domains, custom themes beyond the four standard templates, automatic email delivery, subscriptions, and new calendar rules.
