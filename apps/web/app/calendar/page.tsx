import { currentUserId } from "@project/auth";
import {
  calendarMonthSchema,
  listAppointmentsForUserMonth,
} from "@project/domain";
import Link from "next/link";

export const dynamic = "force-dynamic";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function moveMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const moved = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return moved.toISOString().slice(0, 7);
}

function displayTime(value: Date) {
  const hours = value.getUTCHours();
  const minutes = value.getUTCMinutes();
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const requestedMonth = (await searchParams).month;
  const parsedMonth = calendarMonthSchema.safeParse(
    typeof requestedMonth === "string" ? requestedMonth : currentMonth(),
  );
  const month = parsedMonth.success ? parsedMonth.data : currentMonth();
  const userId = await currentUserId();
  const appointments = await listAppointmentsForUserMonth(userId, month);
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

  return (
    <main className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/customers"
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Customers
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-sm text-neutral-600">
              Scheduled customer appointments for {monthLabel}.
            </p>
          </div>
          <Link
            href="/customers"
            className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white"
          >
            Choose customer
          </Link>
        </div>
      </header>

      <nav aria-label="Calendar month" className="flex items-center justify-between">
        <Link
          href={`/calendar?month=${moveMonth(month, -1)}`}
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Previous month
        </Link>
        <h2 className="font-semibold">{monthLabel}</h2>
        <Link
          href={`/calendar?month=${moveMonth(month, 1)}`}
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
                          {appointment.appointment_services[0]?.service.name ??
                            "Service"}
                        </p>
                        <p>{appointment.location.name}</p>
                        <p>
                          By {appointment.employee.first_name}{" "}
                          {appointment.employee.last_name}
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
}
