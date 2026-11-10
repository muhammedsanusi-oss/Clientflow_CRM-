/*
 * Code guide: apps/web/app/calendar/page.tsx
 * Builds the default YYYY-MM calendar selection from the current date.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { notFound, redirect } from "next/navigation";
/*
 * Import connection: @project/auth -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "@project/auth";
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * calendarMonthSchema: Validator for the calendar YYYY-MM query parameter. Defined in
 * packages/domain/src/appointments.ts.
 * listAppointmentsForUserMonth: Loads month-bounded appointments through active membership predicates on
 * related records for the shared calendar. Defined in packages/domain/src/appointments.ts.
 */
import {
  calendarMonthSchema,
  getOwnerBookingSettings,
  listAppointmentsForOwnerBusinessMonth,
  listAppointmentsForUserMonth,
} from "@project/domain";
/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "next/link";
import { OwnerWorkspace } from "../../components/owner-workspace";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/*
 * Builds the default YYYY-MM calendar selection from the current date.
 */
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/*
 * Calculates a neighboring YYYY-MM value for calendar navigation, including year boundaries.
 */
function moveMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const moved = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return moved.toISOString().slice(0, 7);
}

/*
 * Formats the stored or entered clock value for the appointment UI without adding business-timezone
 * conversion.
 */
function displayTime(value: Date) {
  const hours = value.getUTCHours();
  const minutes = value.getUTCMinutes();
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

/*
 * Monthly appointment calendar at /calendar. Navigate previous/next month, review
 * customer/service/location/scheduler details, and return to a customer to schedule a visit. Calendar display
 * itself does not change bookings.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[]; businessId?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const requestedMonth = parameters.month;
  const parsedMonth = calendarMonthSchema.safeParse(
    typeof requestedMonth === "string" ? requestedMonth : currentMonth(),
  );
  const month = parsedMonth.success ? parsedMonth.data : currentMonth();
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const businessId = parameters.businessId === undefined
    ? undefined
    : typeof parameters.businessId === "string" ? parameters.businessId : "";
  const ownerBusiness = businessId ? await getOwnerBookingSettings(userId, businessId) : null;
  if (businessId !== undefined && !ownerBusiness) notFound();
  const appointments = businessId
    ? await listAppointmentsForOwnerBusinessMonth(userId, businessId, month)
    : await listAppointmentsForUserMonth(userId, month);
  const monthHref = (nextMonth: string) => `/calendar?${businessId ? `businessId=${encodeURIComponent(businessId)}&` : ""}month=${nextMonth}`;
  const [year, monthNumber] = month.split("-").map(Number);
  const monthDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const leadingDays = monthDate.getUTCDay();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthDate);
  const appointmentsByDay = new Map<string, typeof appointments>();

  for (const appointment of appointments) {
    const day = appointment.start_time.toISOString().slice(0, 10);
    const existing = appointmentsByDay.get(day) ?? [];
    existing.push(appointment);
    appointmentsByDay.set(day, existing);
  }

  const calendar = (
    <main className="space-y-6">
      <header className="space-y-3">
        {!ownerBusiness && (
          <Link
            href="/customers"
            className="text-sm text-blue-600 underline underline-offset-2"
          >
            Customers
          </Link>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-sm text-neutral-600">
              {ownerBusiness ? `Appointments for ${ownerBusiness.name} in ${monthLabel}.` : `Scheduled customer appointments for ${monthLabel}.`}
            </p>
          </div>
          <Link
            href={ownerBusiness ? `/customers?businessId=${encodeURIComponent(ownerBusiness.id)}` : "/customers"}
            className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white"
          >
            Choose customer
          </Link>
        </div>
        {ownerBusiness ? <nav aria-label="Business scheduling" className="flex flex-wrap gap-3">
          <Link href={`/calendar/hours?businessId=${encodeURIComponent(ownerBusiness.id)}`} className="text-sm text-blue-700 underline">Business hours &amp; staff</Link>
          <Link href={`/calendar/services?businessId=${encodeURIComponent(ownerBusiness.id)}`} className="text-sm text-blue-700 underline">Manage services</Link>
        </nav> : null}
      </header>

      <nav aria-label="Calendar month" className="flex items-center justify-between">
        <Link
          href={monthHref(moveMonth(month, -1))}
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Previous month
        </Link>
        <h2 className="font-semibold">{monthLabel}</h2>
        <Link
          href={monthHref(moveMonth(month, 1))}
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Next month
        </Link>
      </nav>

      {appointments.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          No appointments are scheduled for this month.
        </p>
      ) : null}

      <section aria-label={`${monthLabel} appointment calendar`}>
        <div className="grid grid-cols-7 border-l border-t border-neutral-200 bg-neutral-50 text-center text-xs font-medium text-neutral-600">
          {weekdayLabels.map((weekday) => (
            <div key={weekday} className="border-b border-r border-neutral-200 p-2">
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-l border-neutral-200">
          {Array.from({ length: leadingDays }, (_, index) => (
            <div
              key={`leading-${index}`}
              aria-hidden="true"
              className="min-h-20 border-b border-r border-neutral-200 bg-neutral-50"
            />
          ))}

          {Array.from({ length: daysInMonth }, (_, index) => {
            const dayNumber = index + 1;
            const dateKey = `${month}-${dayNumber.toString().padStart(2, "0")}`;
            const dayAppointments = appointmentsByDay.get(dateKey) ?? [];

            return (
              <div
                key={dateKey}
                className="min-h-20 border-b border-r border-neutral-200 p-1.5"
              >
                <p className="text-xs font-medium text-neutral-600">{dayNumber}</p>
                {dayAppointments.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {dayAppointments.map((appointment) => (
                      <li
                        key={appointment.id}
                        className="rounded bg-blue-50 p-1 text-[0.65rem] leading-tight text-blue-950"
                      >
                        <p className="font-semibold">
                          {displayTime(appointment.start_time)}–
                          {displayTime(appointment.end_time)}
                        </p>
                        <Link
                          href={`/customers/${appointment.customer.id}`}
                          className="underline underline-offset-1"
                        >
                          {appointment.customer.first_name}{" "}
                          {appointment.customer.last_name}
                        </Link>
                        <p>
                          {appointment.appointment_services[0]?.service_name_at_booking ??
                            appointment.appointment_services[0]?.service.name ??
                            "Service"}
                        </p>
                        <p>{appointment.location.name}</p>
                        <p>
                          {appointment.employee
                            ? `By ${appointment.employee.first_name} ${appointment.employee.last_name}`
                            : appointment.bookingStaff
                              ? `With ${appointment.bookingStaff.name}`
                              : "Online booking"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
  return ownerBusiness
    ? <OwnerWorkspace business={ownerBusiness} active="appointments">{calendar}</OwnerWorkspace>
    : calendar;
}
