---
type: feature
---
# A user can add a customer to their business

## Why

Employees need to create customer records shared within their business without exposing them to unrelated businesses.

## Where it lives

- `apps/web/app/customers/new/page.tsx` - renders the form.
- `apps/web/app/customers/actions.ts` - handles the server operation.
- `packages/domain/src/customers.ts` - owns validation and business-scoped database operations.
- `packages/domain/src/index.ts` - exports the domain functions and schema.
- `tests/integration/customers.test.ts` - verifies validation and tenant isolation.

## Behavior

- `/customers/new` displays fields for first name, last name, phone number, email, address, and preferred contact method.
- The server derives the current user and resolves their active employee and business.
- The client never controls customer ownership.
- The form and server operation do not accept a business ID.
- Shared Zod validation runs before any database write.
- Invalid input returns field errors and creates no customer.
- Valid input creates the customer under the derived business.
- Email and phone number are unique within a business.
- The same email or phone number may exist in unrelated businesses.
- Duplicate values within the same business produce a safe conflict error.
- A user without an active employee-to-business relationship cannot create a customer.
- Raw database errors never reach the client.
- Success revalidates `/customers` and redirects there.
- The form prevents duplicate submissions and exposes its pending state accessibly.

## Examples

| State / input | Behavior |
|---|---|
| Active employee submits valid data | Customer is created under that employee's business |
| Required field is empty | Field error is shown and nothing is written |
| Email exists in the same business | Conflict error is shown |
| Email exists only in another business | Customer is created |
| Client supplies a business ID | It cannot control customer ownership |
| User has no active employee relationship | Nothing is created and no business information is exposed |

## Verify

- Run `pnpm test`.
- Run `pnpm typecheck`.
- Run `pnpm build`.
- Verify the created `business_id` comes from the current user's employee relationship.
- Verify invalid input creates no row.
- Verify duplicate email or phone conflicts only within the same business.
- Verify a supplied business ID cannot target another business.
- Complete the form using only the keyboard.

## Constraints & decisions

- Business is the tenant boundary defined by `docs/adr/0012-business-tenant-boundary.md`.
- Ownership is derived on the server.
- Validation and database operations live in `packages/domain`.
- Errors follow `docs/specs/web.md`.
- This feature requires no new database migration.

## Out of scope

- Editing or deleting customers.
- Customer detail pages.
- Bulk import.
- Assigning customers to individual locations.
- Production authentication.
