---
type: feature
---
# Clients can list and create customers through a JSON API

## Why

Clients need a stable HTTP interface for reading and creating customer records without depending on the web app's pages or Server Actions.

## Where it lives

- `apps/web/app/api/customers/route.ts` - handles collection reads and creates.
- `packages/domain/src/customers.ts` - owns shared validation and business-scoped database operations.
- `packages/domain/src/index.ts` - exports the domain functions and schemas.
- `tests/integration/customer-api.test.ts` - verifies the HTTP contract, validation, and tenant isolation.

## Behavior

- `GET /api/customers` returns the current employee's business customers in last-name, then first-name order.
- A successful list response has the shape `{ "data": { "customers": Customer[] } }` and status 200.
- `POST /api/customers` accepts `firstName`, `lastName`, `phoneNumber`, `email`, `address`, and `preferredContactMethod` as JSON.
- A successful create response has the shape `{ "data": { "customer": Customer } }` and status 201.
- API customer objects expose `id`, `firstName`, `lastName`, `phoneNumber`, `email`, `address`, and `preferredContactMethod`; they do not expose `businessId` or database ownership fields.
- The server derives the current user and business; neither endpoint accepts a user ID or business ID from the client.
- Both endpoints scope all database access to the current user's active employee relationship and business.
- A user without an active employee-to-business relationship receives status 404 with the standard error shape.
- Identity follows the current auth seam: while the development stub is active, a missing `x-user-id` header uses `DEV_USER_ID` or the seeded `demo-user`; after session authentication replaces the stub, a signed-out request receives status 401 with the standard error shape.
- POST validates the complete JSON body with the shared strict Zod schema before writing.
- Invalid JSON or invalid fields return status 400 with code `VALIDATION_ERROR`; no customer is created.
- A duplicate email or phone number in the same business returns status 409 with code `CONFLICT`.
- The same email or phone number in another business does not cause a conflict.
- Unexpected failures are logged on the server and return status 500 with code `INTERNAL_ERROR`; raw errors and stack traces never reach the client.
- Every error response has the shape `{ "error": { "code": string, "message": string } }`.

## Examples

| State / input | Behavior |
|---|---|
| Active employee sends `GET /api/customers` | Returns status 200 and only customers belonging to the employee's business |
| Active employee posts a valid customer | Creates the customer under the derived business and returns status 201 |
| POST body contains `businessId` | Returns status 400 and creates nothing |
| Email exists in the same business | Returns status 409 with a safe conflict error |
| Email exists only in another business | Creates the customer without revealing the other record |
| User has no active employee relationship | Returns status 404 and exposes no business data |
| Development request omits `x-user-id` | Uses `DEV_USER_ID` or the seeded `demo-user`, as defined by the auth seam |
| Session authentication is active and the request is signed out | Returns status 401 |

## Verify

- Run `pnpm test`.
- Run `pnpm typecheck`.
- Run `pnpm build`.
- Use `curl` to list customers and create one with valid JSON; confirm statuses 200 and 201 and the documented response shapes.
- Use `curl` to submit invalid JSON, an extra `businessId`, and a same-business duplicate; confirm statuses 400, 400, and 409 and that no invalid row is written.
- Call both endpoints as employees from two businesses and confirm neither response exposes the other business's customers.

## Constraints & decisions

- Business is the tenant boundary defined by `docs/adr/0012-business-tenant-boundary.md`.
- Identity is derived through `packages/auth` according to `docs/specs/auth.md`.
- Server entry ordering and errors follow `docs/specs/web.md`.
- Validation and database operations stay in `packages/domain` per `docs/adr/0009-domain-web-only.md`.
- Public JSON uses camelCase even though existing database columns use snake_case, keeping the transport contract independent from storage details.
- The endpoints reuse the existing customer schema and domain operations, so this feature requires no migration or dependency.

## Out of scope

- Reading, editing, or deleting one customer.
- Customer notes and appointments.
- Pagination, filtering, and search.
- Replacing the existing customer pages or Server Actions with API calls.
- Implementing production authentication, which is governed by `docs/specs/auth.md`.
