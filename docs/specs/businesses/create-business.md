---
type: feature
---
# Users create businesses and add customers to the selected business

## Why

A signed-in user with no business needs a visible way to create one and begin adding customers. Users with several businesses need to know which business receives each new customer.

## Where it lives

- `apps/web/app/page.tsx` - business count, create actions, and business directory links.
- `apps/web/app/businesses/new/` - business form, server action, loading, and error states.
- `apps/web/app/customers/` - selected business, customer list, creation, notes, and scheduling links.
- `apps/web/app/api/customers/route.ts` - optional authorized business selection for the existing customer collection API.
- `packages/domain/src/schemas/business.ts` - shared business validation.
- `packages/domain/src/queries/business.ts` - transactional business and owner membership creation.
- `packages/domain/src/customers.ts` - authorized business selection and customer ownership.
- `packages/domain/src/appointments.ts` - scheduler membership for the selected customer's business.
- `tests/integration/` - creation, customer linkage, and tenant isolation checks.
- `docs/specs/web.md`, `docs/specs/customers/add-customer.md`, `docs/specs/customers/customer-api.md`, `docs/specs/appointments/customer-calendar.md` - related navigation and ownership contracts updated with implementation.

## Behavior

- The dashboard has a visible `Create business` action beside `Your businesses`, including when the count is zero. The zero-business state also offers that action.
- `/businesses/new` presents business name, business type, contact email, phone number, and the owner's first and last names, using the existing business validation limits and business types.
- Signed-out page requests and server actions redirect to `/login` before accessing business data.
- The form labels fields, preserves input after validation errors, displays field and submission errors, and disables submission while pending.
- Submission derives the owner from the current session, validates shared input, and uses the existing transaction to create both the business and its active `OWNER` employee membership. No client-supplied user or employee identity is accepted.
- A failed transaction creates neither record. Unexpected errors produce a safe message; raw database errors never reach the client.
- Successful creation revalidates the dashboard and opens `/customers?businessId=<created-business-id>`. Returning to the dashboard shows the updated business count and a clickable business card.
- Each business card opens the customer list for that business. The customer list and add-customer form display the selected business name.
- Customer pages offer a business selector when the user has several active business memberships. Without an explicit selection, the newest accessible business is the default, consistent with the dashboard ordering.
- A user with no active business membership sees an explanation and `Create business` action rather than a customer form that cannot succeed.
- The add-customer link and submission preserve the business selection. The server verifies the selected business through the signed-in user's active employee membership before reading or creating customers.
- The customer creation form includes a required `Business` selector listing only accessible businesses. Saving creates the customer and its business link together; there is no separate linking step after creation.
- If no business exists, the customer page offers `Create business` and explains that a business is required before a customer can be saved.
- Customer JSON collection requests may supply `businessId` as a query parameter; the customer JSON body remains unchanged and cannot specify ownership. Omitting the query selects the same default business as the pages.
- Customer creation sets `business_id` to the authorized selected business. Existing customers keep their business relationship.
- Unknown and foreign business IDs have indistinguishable 404 behavior and expose no customer data. Duplicate contact details conflict only within the selected business, following the existing customer contract.
- Notes and scheduling for a customer resolve the current employee membership in that customer's business, so selecting a second business does not attach the action to the user's first membership.
- The calendar retains its existing scope across accessible business memberships; this feature does not introduce a calendar business filter.

## Examples

| State / input | Behavior |
|---|---|
| Signed-in user has zero businesses | Dashboard shows `Create business`; customer pages explain how to create one |
| User submits valid business and owner details | Business and owner membership are created together; selected business customer list opens |
| Required business name is empty or email is invalid | Field errors appear; no business or membership is created |
| Owner membership creation fails | Business creation rolls back and the form shows a safe error |
| User owns businesses A and B and selects B | Customer list and form identify B; a new customer's `business_id` is B |
| User submits another user's business ID | 404; no customer is created or disclosed |
| User schedules a customer in B while also belonging to A | Scheduler membership is selected from B |
| Signed-out visitor opens the business form | Redirect to `/login` |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- With the local app running, run `node tests/http/business-onboarding.mjs` (`API_BASE_URL` selects a disposable instance). The drill submits actual HTML business and customer forms and creates labeled example accounts, businesses, and a customer; do not run it against production.
- Verify business creation produces exactly one business and its active owner membership, with rollback on membership failure.
- Sign in as a new username, create a business from the zero-business dashboard, and confirm the customer list names that business and the dashboard count becomes one.
- Add a customer and verify the stored business relationship and selected-business customer list.
- Create a second business, switch between businesses, and verify new customers, notes, and appointments use the intended business membership.
- Use two users to verify foreign and unknown business selections return the same 404 behavior for page and customer API operations.
- Verify invalid form submissions create no rows and duplicate contacts remain isolated by business.
- Complete business creation and business selection using only the keyboard when browser automation is available; record any unavailable manual verification in the implementation handoff.

## Constraints & decisions

- Reuse the existing transactional business creation query and Prisma models; no schema migration or new dependency is required.
- Business selection is a resource selector, not proof of ownership. Every query verifies active membership through the session-derived user, following `docs/specs/businesses/management-api.md` and `docs/specs/web.md`.
- The business contact email also initializes the owner's employee contact email, matching the existing API; it does not change the user's login username.
- Business names and contact details may repeat because the existing schema does not make them unique.
- Selecting a business does not transfer existing customers. A customer's business relationship remains authoritative for notes and scheduling.
- Business locations and services are not fabricated when creating a business; scheduling continues to explain when active locations or services are missing.
- Validation and queries stay in `packages/domain`, following `docs/adr/0009-domain-web-only.md`.

## Out of scope

- Moving an existing customer between businesses or sharing customers across unrelated businesses.
- Business editing, deletion, employee invitations, and role management.
- Creating locations or services through new screens.
- Production authentication, owned by `docs/specs/auth.md`.
- Calendar availability and conflict handling, outside the existing customer calendar specification.
