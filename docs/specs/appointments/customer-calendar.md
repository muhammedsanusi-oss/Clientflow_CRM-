---
type: feature
---
# Employees can schedule customer appointments on a shared calendar

## Why

Employees need a simple way to record customer visits and review the business calendar. Owners separately manage online availability and customer self-booking in their private workspace.

## Where it lives

- `apps/web/app/calendar/page.tsx` - renders the business's monthly appointment calendar.
- `apps/web/app/calendar/hours/` and `apps/web/app/calendar/services/` - owner-only recurring hours, display-name schedules, and bookable services.
- `apps/web/app/book/[businessId]/` and `apps/web/app/api/sites/[businessId]/booking/` - public availability and customer booking.
- `apps/web/app/calendar/loading.tsx` - renders the calendar loading state.
- `apps/web/app/calendar/error.tsx` - renders a retryable calendar error state.
- `apps/web/app/customers/page.tsx` - links the customer list to the calendar.
- `apps/web/app/customers/[customerId]/page.tsx` - links a customer to the scheduling form.
- `apps/web/app/customers/[customerId]/appointments/new/page.tsx` - renders the scheduling page.
- `apps/web/app/customers/[customerId]/appointments/new/appointment-form.tsx` - provides the accessible appointment form.
- `apps/web/app/customers/[customerId]/appointments/new/actions.ts` - handles appointment creation.
- `packages/domain/src/appointments.ts` - owns appointment validation and business-scoped calendar operations.
- `packages/domain/src/booking.ts` - owns owner schedule settings, public availability, booking, and the owner calendar query.
- `packages/domain/src/index.ts` - exports the appointment domain API.
- `packages/db/prisma/schema.prisma` - associates selectable services with their owning business.
- `packages/db/prisma/migrations/0002_business_tenancy.sql` - establishes service tenancy in the shared CRM schema.
- `packages/db/prisma/migrations/0014_owner_schedules_and_public_booking.sql` - adds owner schedules, booking staff, appointment source, and historical service snapshots.
- `apps/migrate/src/seed.ts` - seeds three example services for the demo business.
- `tests/integration/appointments.test.ts` - verifies scheduling, calendar reads, validation, and tenant isolation.

## Behavior

- `/calendar` displays one month at a time in a seven-column calendar grid with controls for the previous and next month. `/calendar?businessId=<id>` is the owner view for one business and verifies active OWNER membership on every read.
- The current month is the default; `?month=YYYY-MM` selects another month.
- Each appointment appears on its date with its start time, end time, customer name, service snapshot, and location name. Internal appointments show the scheduling employee; public appointments show the assigned display-only staff name or `Online booking`.
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
- A valid submission creates exactly one appointment and one selected-service association with service name, duration, and price snapshots in a single transaction, revalidates the calendar and customer pages, and redirects to the scheduled month on `/calendar`.
- Active internal and public appointments cannot overlap. Internal writes and public booking use the same business-scoped transaction lock, so a staff-created appointment cannot race with a customer reservation.
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
| An internal appointment overlaps an active internal or public appointment | The new appointment is rejected with a conflict message and no row is created |
| An owner opens the business calendar after a public booking | The appointment appears only in that business's owner calendar with its public staff assignment |

## Verify

- Run `pnpm test` and `pnpm test:integration`.
- Run `pnpm typecheck`.
- Run `pnpm build`.
- Schedule an appointment from a customer page and verify the calendar opens to the appointment's month.
- Verify the calendar shows the correct customer, service, times, location, and employee.
- Verify previous-month and next-month navigation using only the keyboard.
- Verify only 30-minute slots from 7:00 AM through 8:00 PM can be submitted and overlong details create no rows.
- Verify unknown and foreign customer, location, or service IDs have indistinguishable not-found behavior.
- Verify overlapping internal and public appointment writes are rejected and public bookings appear only in the matching owner's calendar.
- Complete the scheduling form using only the keyboard.

## Constraints & decisions

- Business is the tenant boundary defined by `docs/adr/0012-business-tenant-boundary.md`.
- Scheduling uses the shared CRM schema, including business-scoped services, the `status` appointment field, enum employee roles, and date-valued hire dates. Existing migrations remain unchanged.
- A user can have memberships in multiple businesses. Customer creation uses an authorized business selector; scheduling resolves the employee membership in the customer's business. Resource reads are scoped through active memberships.
- `Service 1`, `Service 2`, and `Service 3` are explicitly demo placeholders, each with a 30-minute duration and zero example price, until the group defines the service catalog.
- Appointment creation copies the selected service's current base price into `price_at_booking` with quantity one, even though the placeholder price is zero.
- The fixed `SCHEDULED` status avoids inventing a status workflow before the group decides one.
- The employee handling the customer call or in-person request is recorded as the scheduler; selecting the employee who will perform the service waits for the availability workflow.
- The calendar is implemented with existing React and CSS capabilities; no calendar dependency is added for this deliberately small first version.
- Internal appointment entry remains available to active business employees; owner-only schedule management and the public booking flow follow the separate customer-booking spec.
- Validation and database operations live in `packages/domain` per `docs/adr/0009-domain-web-only.md`.
- Errors and foreign-resource handling follow `docs/specs/web.md`.

## Out of scope

- Employee availability, working hours, time off, or schedule templates.
- Selecting or reassigning the business's login-account employees who will handle a service; public booking uses optional display-only staff names.
- Service-catalog management; owners manage bookable names and durations as described in [customer booking](./customer-booking.md).
- Multiple services or quantities on one appointment.
- Payments, reminders, or notifications.
- Editing, rescheduling, canceling, or deleting appointments.
- Recurring appointments and external calendar synchronization.
- Business-specific time zones.
