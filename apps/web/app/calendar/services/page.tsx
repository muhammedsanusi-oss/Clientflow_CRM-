import { currentUserId } from "@project/auth";
import { getOwnerBookingSettings } from "@project/domain";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { OwnerWorkspace } from "../../../components/owner-workspace";
import { saveServiceAction, setServiceActiveAction } from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  invalid: "Check the submitted fields and try again.",
  conflict: "A service with those details already exists.",
  internal: "The service could not be saved. Try again.",
};

export default async function BusinessServicesPage({ searchParams }: {
  searchParams: Promise<{ businessId?: string | string[]; error?: string | string[] }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const params = await searchParams;
  const businessId = typeof params.businessId === "string" ? params.businessId : "";
  if (!businessId) notFound();
  const settings = await getOwnerBookingSettings(userId, businessId);
  if (!settings) notFound();
  const error = typeof params.error === "string" ? errorMessages[params.error] : undefined;

  return <OwnerWorkspace business={settings}>
    <main className="mx-auto max-w-4xl space-y-8 px-5 py-10">
    <header className="space-y-3">
      <Link href={`/calendar?businessId=${encodeURIComponent(businessId)}`} className="text-sm text-indigo-700 underline">Back to {settings.name} calendar</Link>
      <div><h1 className="text-3xl font-semibold">Bookable services</h1><p className="mt-2 text-slate-600">Customers can book active services using each service's duration. Price is not collected online.</p></div>
      <nav className="flex gap-4 text-sm"><Link className="text-indigo-700 underline" href={`/calendar/hours?businessId=${encodeURIComponent(businessId)}`}>Manage hours &amp; staff</Link></nav>
    </header>
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold">Add a service</h2>
      <form action={saveServiceAction} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="businessId" value={businessId} />
        <label className="text-sm font-medium">Service name<input name="name" required maxLength={100} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
        <label className="text-sm font-medium">Duration in minutes<input name="durationMinutes" type="number" min={15} max={720} step={15} required className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
        <label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" maxLength={1000} rows={3} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
        <button className="w-fit rounded-lg bg-indigo-700 px-4 py-2 font-medium text-white">Add service</button>
      </form>
    </section>

    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold">Your services</h2>
      {settings.services.length ? <ul className="space-y-4">{settings.services.map((service) => <li key={service.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
        <form action={saveServiceAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="serviceId" value={service.id} />
          <label className="text-sm font-medium">Name<input name="name" defaultValue={service.name} required maxLength={100} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
          <label className="text-sm font-medium">Duration in minutes<input name="durationMinutes" type="number" min={15} max={720} step={15} defaultValue={service.duration_minutes} required className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
          <label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" defaultValue={service.description} maxLength={1000} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <p className="text-sm text-slate-600">{service.is_Active ? "Active · bookable online" : "Inactive · hidden from online booking"}</p>
            <button className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-medium text-indigo-700">Save changes</button>
          </div>
        </form>
        <form action={setServiceActiveAction}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="isActive" value={String(!service.is_Active)} />
          <button className="text-sm text-indigo-700 underline">{service.is_Active ? "Deactivate service" : "Reactivate service"}</button>
        </form>
      </li>)}</ul> : <p className="text-sm text-slate-600">No services yet. Add one before customers can book.</p>}
    </section>
    </main>
  </OwnerWorkspace>;
}
