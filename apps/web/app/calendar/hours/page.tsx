import { currentUserId } from "@project/auth";
import { getOwnerBookingSettings } from "@project/domain";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { OwnerWorkspace } from "../../../components/owner-workspace";
import {
  addBookingStaffAction,
  addBookingStaffHoursAction,
  addBusinessHoursAction,
  removeBookingStaffHoursAction,
  removeBusinessHoursAction,
  updateBookingStaffAction,
} from "./actions";

export const dynamic = "force-dynamic";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const errorMessages: Record<string, string> = {
  invalid: "Check the submitted fields and try again.",
  conflict: "Those hours overlap, or staff availability falls outside the business hours.",
  internal: "The schedule could not be saved. Try again.",
};

function IntervalRows({ intervals, businessId, removeAction, staffId }: {
  intervals: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>;
  businessId: string;
  removeAction: (formData: FormData) => void;
  staffId?: string;
}) {
  if (!intervals.length) return <p className="text-sm text-slate-500">No recurring hours set.</p>;
  return <ul className="space-y-2">{intervals.map((interval) => <li key={interval.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
    <span>{weekdays[interval.dayOfWeek]} · {interval.startTime}–{interval.endTime}</span>
    <form action={removeAction}>
      <input type="hidden" name="businessId" value={businessId} />
      {staffId ? <input type="hidden" name="staffId" value={staffId} /> : null}
      <input type="hidden" name="intervalId" value={interval.id} />
      <button className="text-red-700 underline">Remove</button>
    </form>
  </li>)}</ul>;
}

export default async function BusinessHoursPage({ searchParams }: {
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
      <div><h1 className="text-3xl font-semibold">Business hours &amp; staff</h1><p className="mt-2 text-slate-600">Set recurring local hours. Staff availability must fit within an opening interval.</p></div>
      <nav className="flex gap-4 text-sm"><Link className="text-indigo-700 underline" href={`/calendar/services?businessId=${encodeURIComponent(businessId)}`}>Manage services</Link></nav>
    </header>
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      <div><h2 className="text-xl font-semibold">Opening hours</h2><p className="mt-1 text-sm text-slate-600">Add separate intervals for split shifts. Leave a day empty to mark it closed.</p></div>
      <IntervalRows intervals={settings.hoursIntervals} businessId={businessId} removeAction={removeBusinessHoursAction} />
      <form action={addBusinessHoursAction} className="grid gap-3 sm:grid-cols-4 sm:items-end">
        <input type="hidden" name="businessId" value={businessId} />
        <label className="text-sm font-medium">Day<select name="dayOfWeek" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2">{weekdays.map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label>
        <label className="text-sm font-medium">Open<input name="startTime" type="time" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
        <label className="text-sm font-medium">Close<input name="endTime" type="time" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
        <button className="rounded-lg bg-indigo-700 px-4 py-2 font-medium text-white">Add hours</button>
      </form>
    </section>

    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      <div><h2 className="text-xl font-semibold">Schedulable staff names</h2><p className="mt-1 text-sm text-slate-600">These display-only names do not create login accounts or give staff access to the private CRM.</p></div>
      <form action={addBookingStaffAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="businessId" value={businessId} />
        <label className="min-w-60 flex-1 text-sm font-medium">Name<input name="name" required maxLength={100} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
        <button className="rounded-lg bg-indigo-700 px-4 py-2 font-medium text-white">Add staff name</button>
      </form>
      {settings.bookingStaff.length ? <ul className="space-y-5">{settings.bookingStaff.map((staff) => <li key={staff.id} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <form action={updateBookingStaffAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="staffId" value={staff.id} />
            <label className="text-sm font-medium">Staff display name<input name="name" defaultValue={staff.name} required maxLength={100} className="mt-1 block rounded-lg border border-slate-300 p-2" /></label>
            <input type="hidden" name="isActive" value={String(staff.isActive)} />
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Save name</button>
          </form>
          <form action={updateBookingStaffAction}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="staffId" value={staff.id} />
            <input type="hidden" name="name" value={staff.name} />
            <input type="hidden" name="isActive" value={String(!staff.isActive)} />
            <button className="text-sm text-indigo-700 underline">{staff.isActive ? "Deactivate" : "Reactivate"}</button>
          </form>
        </div>
        <IntervalRows intervals={staff.hours} businessId={businessId} staffId={staff.id} removeAction={removeBookingStaffHoursAction} />
        {staff.isActive ? <form action={addBookingStaffHoursAction} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="staffId" value={staff.id} />
          <label className="text-sm font-medium">Day<select name="dayOfWeek" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2">{weekdays.map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label>
          <label className="text-sm font-medium">Available from<input name="startTime" type="time" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
          <label className="text-sm font-medium">Available until<input name="endTime" type="time" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
          <button className="rounded-lg border border-indigo-700 px-4 py-2 font-medium text-indigo-700">Add availability</button>
        </form> : <p className="text-sm text-slate-500">Inactive names are hidden from public booking.</p>}
      </li>)}</ul> : <p className="text-sm text-slate-500">No schedulable staff names. Customers will book against one shared business schedule.</p>}
    </section>
    </main>
  </OwnerWorkspace>;
}
