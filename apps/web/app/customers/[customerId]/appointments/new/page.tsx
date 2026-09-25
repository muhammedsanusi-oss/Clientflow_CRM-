import { currentUserId } from "@project/auth";
import {
  appointmentTimeSlots,
  getAppointmentFormForUser,
} from "@project/domain";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppointmentForm } from "./appointment-form";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const userId = await currentUserId();
  const formData = await getAppointmentFormForUser(userId, customerId);

  if (!formData) {
    notFound();
  }

  return (
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
  );
}
