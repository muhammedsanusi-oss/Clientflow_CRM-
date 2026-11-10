---
type: feature
---
# Owners manage availability and customers book appointments online

## Why

Business owners need to manage their services, operating hours, and staff availability in their private workspace. Customers need a straightforward way to choose a service and book a real available time without seeing the business's internal CRM.

## Where it lives

- `apps/web/app/owner/page.tsx` - redirects owners to their newest business calendar.
- `apps/web/app/calendar/` - shows the selected business's appointments and links to schedule settings.
- `apps/web/app/calendar/hours/` - manages the business's recurring weekly hours and named staff availability.
- `apps/web/app/calendar/services/` - manages the business's bookable service catalog and durations.
- `apps/web/app/sites/[businessId]/` - public business website with a booking entry point.
- `apps/web/app/book/[businessId]/` - public customer booking flow and availability display.
- `apps/web/app/api/sites/[businessId]/booking/` - exposes only public booking choices and accepts a booking.
- `packages/domain/src/appointments.ts` - business-scoped internal appointment creation and the employee calendar.
- `packages/domain/src/booking.ts` - owner-verified schedule/service changes, public availability, and transactional booking.
- `packages/domain/src/queries/appointments.ts` - business-scoped appointment API reads and writes.
- `packages/db/prisma/schema.prisma` and append-only migrations - persist schedules, staff display profiles, and public bookings.
- `tests/integration/appointments.test.ts` and related public booking tests - verify booking rules and tenant isolation.
- `docs/specs/appointments/customer-calendar.md` - internal calendar and staff-created appointments.
- `docs/specs/businesses/website-templates.md` and `docs/specs/businesses/website-editing.md` - public website booking link and owner website editing entry.

## Behavior

- The owner dashboard opens the newest business calendar. The shared workspace navigation provides its calendar, customer, and configured website links; calendar pages link to Hours and Services.
- The owner calendar shows only appointments for the selected business. Selecting a business in the URL is a hint; every read and write verifies the signed-in user's active OWNER membership.
- The owner can set recurring opening intervals for each weekday and mark a day closed. A day can contain multiple non-overlapping intervals, such as a morning and afternoon shift.
- The owner can add, rename, deactivate, and set recurring availability for staff display names without creating user accounts. Staff availability must fall within the business's opening intervals.
- The owner can create, edit, and deactivate bookable services, including each service's name and duration. Existing appointments preserve their service and duration snapshots.
- A configured public business website links to that business's booking page. A customer can also open the booking page directly from its business-specific public URL.
- The public page shows only bookable services, the business's public location choices, public staff display names when configured, opening dates, and genuinely available appointment times. It never shows notes, customer lists, staff account details, inquiries, or another business's data.
- The customer enters their name and contact details, chooses a service and location, and selects a date and available time. If the business has schedulable staff, the customer may select a staff member or choose any available staff member.
- When no staff display names are configured, booking uses one shared business schedule and permits only one appointment at a time for an overlapping interval.
- Availability is calculated from business opening intervals, optional staff intervals, service duration, location, and existing appointments. A slot is offered only when the full service duration fits within both business and selected staff availability.
- Start times are offered on 30-minute boundaries. Appointment dates and times use the business's entered wall-clock time; the UI labels this clearly and does not convert time zones.
- A valid booking is immediately confirmed only if its requested service, location, business hours, staff availability, and non-overlap rules remain valid when the booking is written. Slot validation and booking creation are atomic so concurrent requests cannot reserve the same staff/time or exceed the shared schedule.
- Internal appointment writes share the booking lock and reject overlapping active appointments so an internal booking cannot race with a public reservation.
- A successful public booking creates one appointment and one associated service line, and creates or links a business-scoped customer record using the submitted contact details. Existing customer details are not silently overwritten.
- Invalid, outside-hours, unavailable, overlapping, foreign, or unknown booking requests create no appointment. Public lookup failures do not reveal private CRM records or whether a foreign business exists.
- Booking collection does not require a customer account and does not collect payment. It does not expose internal notes or other CRM information.
- Existing internal appointment creation continues to require a signed-in active business employee and remains separate from public booking. The internal calendar shows both kinds of appointment with their customer, service, location, time, and assigned staff when applicable.
- Signed-out owners are redirected to sign in. A user without active OWNER membership cannot manage business hours, services, staff availability, or that business's calendar; foreign and unknown resources return the same not-found result.
- Public booking validates all submitted values on the server, limits request size, enforces same-origin writes and abuse limits, and returns only safe validation or availability errors. Raw database errors and submitted contact details are not returned in error responses or written to logs.

## Examples

| State / input | Behavior |
|---|---|
| Owner sets Tuesday hours to 9:00-12:00 and 13:00-17:00 | The public calendar offers only service slots fully inside one of those intervals |
| Owner adds a staff display name with Wednesday availability | Customers can choose that staff name only for slots in that staff member's availability |
| Customer books a 60-minute service at 10:00 during a 9:00-12:00 interval | One confirmed 10:00-11:00 appointment and service association are created |
| Customer requests a time outside opening hours or staff availability | The request is rejected and no appointment is created |
| Two customers concurrently request overlapping appointments for the same staff member | At most one booking is confirmed; the other receives an unavailable-slot response |
| A customer opens business A's booking page with a business B service ID | No booking is created and no business B data is disclosed |
| A visitor opens a public booking page | Only public booking choices and available times are visible; CRM notes and customer records are not |
| An owner attempts to edit another business's hours | The resource is not found and the other business's settings remain unchanged |

## Verify

- Run `pnpm test` and the focused appointment/public booking integration tests.
- Run `pnpm typecheck` and `pnpm build`.
- Manually set business hours, add a service and optional staff schedule, and complete a public booking; verify it appears only on that business's internal calendar.
- Verify bookings cannot start outside business or staff hours, exceed an interval, overlap a confirmed booking, or target a foreign service/location.
- Verify concurrent requests for the same overlapping slot produce no more than one confirmed appointment.
- Verify the public page and booking API disclose no CRM notes, customer lists, inquiry contents, owner credentials, or foreign-business details.
- Verify a business without a configured website has no public booking entry point, while its owner can still manage its private schedule.
- Complete owner schedule controls and the public booking flow using only the keyboard.

## Constraints & decisions

- Business is the tenant boundary defined by `docs/adr/0012-business-tenant-boundary.md`; all schedule and booking queries enforce it in the database predicate.
- Staff names added for scheduling are display-only records, not employee memberships or login identities. A booking never invents an authenticated employee as its author.
- Public booking times are business-local wall-clock values, consistent with the existing calendar. Time-zone conversion is not included in this demo.
- Availability uses a 30-minute start-time grid and the configured service duration; appointment duration is not chosen by the customer.
- The public booking form collects only contact information needed to identify and reach the customer. It does not ask for medical, financial, or other sensitive details.
- Appointments are confirmed immediately when the atomic availability check succeeds. Payment, approval queues, and payment status are not part of this demo.
- Existing internal calendar and customer note behavior remain private and business-scoped. The public booking route is a deliberate public surface and returns only the booking contract.
- Database changes use new append-only migrations; applied migrations and existing customer or appointment records remain intact.
- Validation and database operations live in `packages/domain` per `docs/adr/0009-domain-web-only.md`; error and foreign-resource handling follow `docs/specs/web.md`.

## Out of scope

- Payment collection, deposits, subscriptions, refunds, and checkout.
- Customer login accounts, self-service appointment cancellation or rescheduling, reminders, and external calendar synchronization.
- Employee credentials, invitations, access to the private CRM, time-off requests, payroll, or employee-specific service qualifications.
- Time-zone conversion, recurring appointment series, and conflict resolution for legacy appointments that already overlap.
- Public access to customer notes, contact inquiries, customer lists, owner details, or internal calendar annotations.
- Replacing or redesigning the existing website editor; its owner access and behavior remain described in [website editing](../businesses/website-editing.md).
