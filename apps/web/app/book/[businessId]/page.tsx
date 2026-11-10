import { getPublicBookingOptions } from "@project/domain";
import { notFound } from "next/navigation";
import { PublicBookingForm } from "../../../components/business-sites/public-booking-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({ params }: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const options = await getPublicBookingOptions(businessId);
  if (!options) notFound();

  return <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
    <header className="space-y-3">
      <Link href={`/sites/${encodeURIComponent(businessId)}`} className="text-sm text-indigo-700 underline">Back to {options.name}</Link>
      <div><p className="text-sm font-medium text-indigo-700">Appointment booking</p><h1 className="text-3xl font-semibold">{options.name}</h1><p className="mt-2 text-slate-600">Choose a service, location, and available time. Times use the business&apos;s local schedule.</p></div>
    </header>
    {options.services.length && options.locations.length ? <PublicBookingForm
      businessId={options.id}
      businessName={options.name}
      services={options.services}
      locations={options.locations}
      staff={options.bookingStaff}
      today={new Date().toISOString().slice(0, 10)}
    /> : <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-700">Online booking is not available yet. Contact the business directly to schedule.</p>}
  </main>;
}
