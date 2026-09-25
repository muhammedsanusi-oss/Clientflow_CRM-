---
type: feature
---
# Employees can schedule customer appointments on a shared calendar

## Why

Employees need a simple way to record when a customer plans to visit and to see the business's scheduled appointments without committing to availability or service-management rules that the team has not yet decided.

## Where it lives

- `apps/web/app/calendar/page.tsx` - renders the business's monthly appointment calendar.
- `apps/web/app/calendar/loading.tsx` - renders the calendar loading state.
- `apps/web/app/calendar/error.tsx` - renders a retryable calendar error state.
- `apps/web/app/customers/page.tsx` - links the customer list to the calendar.
- `apps/web/app/customers/[customerId]/page.tsx` - links a customer to the scheduling form.
- `apps/web/app/customers/[customerId]/appointments/new/page.tsx` - renders the scheduling page.
- `apps/web/app/customers/[customerId]/appointments/new/appointment-form.tsx` - provides the accessible appointment form.
- `apps/web/app/customers/[customerId]/appointments/new/actions.ts` - handles appointment creation.
- `packages/domain/src/appointments.ts` - owns appointment validation and business-scoped calendar operations.
- `packages/domain/src/index.ts` - exports the appointment domain API.
- `packages/db/prisma/schema.prisma` - associates selectable services with their owning business.
- `packages/db/prisma/migrations/0003_business_services.sql` - adds the append-only service tenancy migration.
- `apps/migrate/src/seed.ts` - seeds three example services for the demo business.
- `tests/integration/appointments.test.ts` - verifies scheduling, calendar reads, validation, and tenant isolation.

## Behavior

- `/calendar` displays one month at a time in a seven-column calendar grid with controls for the previous and next month.
- The current month is the default; `?month=YYYY-MM` selects another month.
- Each scheduled appointment appears on its date with its start time, end time, customer name, selected service, location name, and scheduling employee name.
- Calendar appointments are ordered by start time within each date.
- A month with no appointments still displays the calendar and an empty-state explanation.
- The customer detail page displays an underlined `Schedule` action next to the add-note area.
- The scheduling page shows the customer name and accepts a date, service, time slot, active business location, and optional appointment details of at most 1,000 characters.
- The service choices are the active services belonging to the current employee's business; the demo business initially has `Service 1`, `Service 2`, and `Service 3`.
- The available start-time choices are fixed 30-minute increments from 7:00 AM through 8:00 PM, inclusive.
- Each example service lasts 30 minutes, so the appointment end time is calculated from the selected start time and service duration rather than entered separately.
- The current active employee is recorded as the employee who scheduled the appointment; the client cannot choose an employee or business in this first version.
- A new appointment receives the fixed status `SCHEDULED`.
- Shared Zod validation rejects a malformed date, a time outside the fixed slot list, a missing service or location, and details over 1,000 characters.
- Dates and times are treated as the business's entered wall-clock values; timezone conversion is not performed in this first version.
- The server derives the current employee and business from the current user and verifies that the customer, active location, and active service all belong to that business.
- An unknown or foreign customer, location, or service, or a user without an active employee relationship, receives the same not-found result and creates no appointment.
- A valid submission creates exactly one appointment and one selected-service association in a single transaction, revalidates the calendar and customer pages, and redirects to the scheduled month on `/calendar`.
- The form prevents duplicate submissions and announces pending, validation, and server errors accessibly.
- Raw database errors never reach the client.

## Examples

| State / input | Behavior |
|---|---|
| Active employee selects `Service 1` for Maria at Downtown at 10:00 AM | One 10:00-10:30 `SCHEDULED` appointment and its service association are created with that employee recorded as scheduler |
| Another active employee in the same business opens that month | The appointment and its customer, service, location, and employee are visible |
| Submitted time is 10:15 AM | A field error is shown because it is not one of the fixed 30-minute slots, and nothing is written |
| Details contain more than 1,000 characters | A field error is shown and nothing is written |
| A business A employee submits a business B customer, location, or service ID | The operation returns not found and nothing is written |
| User has no active employee relationship | No calendar data is exposed and nothing is written |
| Two appointments overlap | Both are saved because conflict and availability rules are not part of this version |

## Verify

- Run `pnpm test` and `pnpm test:integration`.
- Run `pnpm typecheck`.
- Run `pnpm build`.
- Schedule an appointment from a customer page and verify the calendar opens to the appointment's month.
- Verify the calendar shows the correct customer, service, times, location, and employee.
- Verify previous-month and next-month navigation using only the keyboard.
- Verify only 30-minute slots from 7:00 AM through 8:00 PM can be submitted and overlong details create no rows.
- Verify unknown and foreign customer, location, or service IDs have indistinguishable not-found behavior.
- Complete the scheduling form using only the keyboard.

## Constraints & decisions

- Business is the tenant boundary defined by `docs/adr/0012-business-tenant-boundary.md`.
- Services gain a required business relationship because tenant-owned records must be reachable through the business boundary; the change is an append-only migration.
- `Service 1`, `Service 2`, and `Service 3` are explicitly demo placeholders, each with a 30-minute duration and zero example price, until the group defines the service catalog.
- Appointment creation copies the selected service's current base price into `price_at_booking` with quantity one, even though the placeholder price is zero.
- The fixed `SCHEDULED` status avoids inventing a status workflow before the group decides one.
- The employee handling the customer call or in-person request is recorded as the scheduler; selecting the employee who will perform the service waits for the availability workflow.
- The calendar is implemented with existing React and CSS capabilities; no calendar dependency is added for this deliberately small first version.
- Scheduling does not reject overlaps because availability and conflict behavior must be designed together later.
- Validation and database operations live in `packages/domain` per `docs/adr/0009-domain-web-only.md`.
- Errors and foreign-resource handling follow `docs/specs/web.md`.

## Out of scope

- Employee availability, working hours, time off, or schedule templates.
- Conflict detection or warnings for overlapping appointments.
- Selecting or reassigning the employee who will handle the appointment.
- Creating, editing, pricing, categorizing, or deactivating services beyond the three seeded placeholders.
- Multiple services or quantities on one appointment.
- Payments, reminders, or notifications.
- Editing, rescheduling, canceling, or deleting appointments.
- Recurring appointments and external calendar synchronization.
- Business-specific time zones.
