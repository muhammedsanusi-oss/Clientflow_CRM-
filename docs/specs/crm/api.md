---
type: feature
---
# Business-scoped CRM API

## Why
The CRM entities in the database are available through authenticated HTTP
endpoints so the web app can manage business records without bypassing the
shared validation and tenancy rules.

## Where it lives
- `packages/domain/src/schemas/` validates CRM request bodies.
- `packages/domain/src/queries/` performs business-scoped Prisma access.
- `apps/web/app/api/Business/` contains the Next.js App Router endpoints.
- `apps/web/app/api/_lib/route-helpers.ts` provides shared request/error handling.

## Behavior
- Every business endpoint derives the user from the auth seam. Signed-out
  requests return 401; a foreign or unknown business/resource returns 404.
- Collections are nested under `/api/Business/[id]`. Businesses, employees,
  locations, customers, services, appointments, and tasks have collection
  GET/POST routes and item GET routes.
- Customer notes and interactions are nested beneath a customer; payments are
  nested beneath an appointment. Each has collection GET/POST and item GET.
- Appointment input supplies service IDs and quantities. The server verifies
  that all related records belong to the selected business and copies each
  service's current base price into the appointment-service price snapshot.
- Notes and interactions are attributed to the signed-in user's employee
  membership. Employee creation targets a previously registered user by
  normalized username; tasks and appointments may reference employees in the
  same business.
- JSON and Zod validation failures return 400, uniqueness/constraint conflicts
  return 409, and unexpected errors are logged and returned as a generic 500.
- Appointment service lines are created atomically with their appointment.

## Examples

| State / input | Behavior |
|---|---|
| Signed-in member lists `/api/Business/{id}/services` | Returns only services for that business |
| Signed-out request to a business endpoint | Returns 401 |
| Member submits an appointment with a foreign service ID | Returns 404 and creates no appointment |
| Invalid service duration or malformed request JSON | Returns 400 |

## Verify
- `pnpm --filter @project/domain test`
- `pnpm typecheck`
- `pnpm build`

## Constraints & decisions
- The route base retains the existing `/api/Business` casing for compatibility.
- Collection endpoints support list/create; item endpoints currently support
  reads. Updates and deletes are not exposed because the current request only
  defines create and read behavior and the data model has no soft-delete fields.
- `Appointment_Service` is managed through appointment creation rather than a
  separate route, preserving the business/service validation and price snapshot.

## Out of scope
- Authentication implementation changes are governed by [auth](../auth.md).
- UI pages and forms are not included.
