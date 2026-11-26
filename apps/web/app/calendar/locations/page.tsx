import { currentUserId } from "../../../../../packages/auth/src/index";
import { getOwnerBookingSettings } from "../../../../../packages/domain/src/index";
import { notFound, redirect } from "next/navigation";
import Link from "../../../components/app-link";
import { OwnerWorkspace } from "../../../components/owner-workspace";
import { BookingSetup } from "../../../components/booking-setup";
import { LocationForm } from "./location-form";

export const dynamic = "force-dynamic";
export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { businessId } = await searchParams;
  if (typeof businessId !== "string" || !businessId) notFound();
  const business = await getOwnerBookingSettings(userId, businessId);
  if (!business) notFound();
  return <OwnerWorkspace business={business} description="Booking locations"><main className="mx-auto max-w-4xl space-y-6 px-5 py-8">
    <header className="space-y-2"><Link href={`/calendar?businessId=${encodeURIComponent(businessId)}`} className="text-sm text-indigo-700 underline">Back to calendar</Link>
      <h1 className="text-3xl font-semibold">Business locations</h1><p className="text-slate-600">Add the places where customers can attend appointments. Use fictional details for the showcase.</p></header>
    <BookingSetup business={business} />
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-xl font-semibold">Your locations</h2>
      {business.locations.length ? <ul className="space-y-3">{business.locations.map(location => <li key={location.id} className="rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold">{location.name}{!location.is_active && " (inactive)"}</h3><p>{location.address}</p>
        {location.phone_number && <p className="text-sm">{location.phone_number}</p>}{location.email && <p className="break-all text-sm">{location.email}</p>}
      </li>)}</ul> : <p className="text-slate-600">No locations yet. Add your first location below to enable appointment setup.</p>}
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-xl font-semibold">Add a location</h2><LocationForm businessId={businessId} /></section>
  </main></OwnerWorkspace>;
}
