/*
 * Code guide: apps/web/app/customers/[customerId]/appointments/new/page.tsx
 * Loads the authorized customer plus active services and locations, then renders the scheduling form with the
 * fixed time-slot options.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { redirect } from "next/navigation";
/*
 * Import connection: @project/auth -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "@project/auth";
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * appointmentTimeSlots: Fixed half-hour scheduling choices from 07:00 through 20:00. Defined in
 * packages/domain/src/appointments.ts.
 * getAppointmentFormForUser: Loads the accessible customer and the active locations/services needed by the
 * scheduling form. Defined in packages/domain/src/appointments.ts.
 */
import {
  appointmentTimeSlots,
  getAppointmentFormForUser,
} from "@project/domain";
/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "next/link";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 */
import { notFound } from "next/navigation";

/*
 * Import connection: ./appointment-form ->
 * apps/web/app/customers/[customerId]/appointments/new/appointment-form.tsx.
 * AppointmentForm: Choose a date, service, start time, location, and optional details for this customer.
 * Submits to scheduleAppointmentAction; an active service and location are required.
 */
import { AppointmentForm } from "./appointment-form";
import { OwnerWorkspace } from "../../../../../components/owner-workspace";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

/*
 * Loads the authorized customer plus active services and locations, then renders the scheduling form with the
 * fixed time-slot options.
 */
export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const formData = await getAppointmentFormForUser(userId, customerId);

  if (!formData) {
    notFound();
  }

  return (
    <OwnerWorkspace business={formData.business} active="appointments">
    <main className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <Link
          href={`/customers/${formData.id}`}
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Back to customer
        </Link>
        <h1 className="text-2xl font-bold">Schedule appointment</h1>
        <p className="text-sm text-neutral-600">
          Scheduling for {formData.first_name} {formData.last_name}
        </p>
      </header>

      <AppointmentForm
        customerId={formData.id}
        defaultDate={new Date().toISOString().slice(0, 10)}
        locations={formData.business.locations}
        services={formData.business.services}
        timeSlots={[...appointmentTimeSlots]}
      />
    </main>
    </OwnerWorkspace>
  );
}
