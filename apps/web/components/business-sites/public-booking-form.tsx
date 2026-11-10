"use client";

import { useEffect, useState, type FormEvent } from "react";

type ServiceOption = { id: string; name: string; description: string; duration_minutes: number };
type LocationOption = { id: string; name: string; address: string };
type StaffOption = { id: string; name: string };

function displayTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${minutes.toString().padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

export function PublicBookingForm({ businessId, businessName, services, locations, staff, today }: {
  businessId: string;
  businessName: string;
  services: ServiceOption[];
  locations: LocationOption[];
  staff: StaffOption[];
  today: string;
}) {
  const [serviceId, setServiceId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    setStartTime("");
    setConfirmation("");
    if (!serviceId || !locationId || !date) {
      setSlots([]);
      return;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({ serviceId, locationId, staffId, date });
    setLoadingSlots(true);
    setError("");
    fetch(`/api/sites/${encodeURIComponent(businessId)}/booking?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Available times could not be loaded.");
      return body as { times: string[] };
    }).then((body) => {
      setSlots(body.times);
    }).catch((reason: unknown) => {
      if (reason instanceof Error && reason.name !== "AbortError") {
        setSlots([]);
        setError(reason.message);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingSlots(false);
    });
    return () => controller.abort();
  }, [businessId, date, locationId, serviceId, staffId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setConfirmation("");
    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());
    try {
      const response = await fetch(`/api/sites/${encodeURIComponent(businessId)}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? "Your appointment could not be booked.");
      setConfirmation(`Your appointment with ${businessName} is confirmed for ${date} at ${displayTime(startTime)}.`);
      setStartTime("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your appointment could not be booked.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {confirmation ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">{confirmation}</p> : null}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Service<select required value={serviceId} onChange={(event) => setServiceId(event.target.value)} name="serviceId" className="mt-1 block w-full rounded-lg border border-slate-300 p-2"><option value="">Choose a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} ({service.duration_minutes} min)</option>)}</select></label>
      <label className="text-sm font-medium">Location<select required value={locationId} onChange={(event) => setLocationId(event.target.value)} name="locationId" className="mt-1 block w-full rounded-lg border border-slate-300 p-2"><option value="">Choose a location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.address ? ` · ${location.address}` : ""}</option>)}</select></label>
      {staff.length ? <label className="text-sm font-medium sm:col-span-2">Staff member<select value={staffId} onChange={(event) => setStaffId(event.target.value)} name="staffId" className="mt-1 block w-full rounded-lg border border-slate-300 p-2"><option value="">Any available staff member</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label> : null}
      <label className="text-sm font-medium">Date<input required type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} name="date" className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
      <label className="text-sm font-medium">Available time<select required value={startTime} onChange={(event) => setStartTime(event.target.value)} name="startTime" disabled={!slots.length || loadingSlots} className="mt-1 block w-full rounded-lg border border-slate-300 p-2"><option value="">{loadingSlots ? "Loading available times…" : "Choose a time"}</option>{slots.map((time) => <option value={time} key={time}>{displayTime(time)}</option>)}</select></label>
    </div>
    {!loadingSlots && serviceId && locationId && !slots.length && !error ? <p className="text-sm text-slate-600">No available times for this selection. Try another date or staff member.</p> : null}
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-3 text-base font-semibold">Your contact details</legend>
      <label className="text-sm font-medium">First name<input name="firstName" required maxLength={100} autoComplete="given-name" className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
      <label className="text-sm font-medium">Last name<input name="lastName" required maxLength={100} autoComplete="family-name" className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
      <label className="text-sm font-medium">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
      <label className="text-sm font-medium">Phone<input name="phone" type="tel" required maxLength={30} autoComplete="tel" className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
    </fieldset>
    <label aria-hidden="true" className="sr-only">Leave blank<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <button disabled={pending || loadingSlots || !startTime} className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Confirming…" : "Book appointment"}</button>
    <p className="text-xs text-slate-500">Your booking is confirmed immediately. Please contact the business directly if you need to change it.</p>
  </form>;
}
