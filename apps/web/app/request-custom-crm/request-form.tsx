"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CustomCrmRequest } from "../../../../packages/domain/src/callback-request";

export function CustomCrmRequestForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timeZone, setTimeZone] = useState("");
  useEffect(() => { setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const parsed = CustomCrmRequest.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setPending(false);
      return;
    }
    try {
      const response = await fetch("/api/custom-crm-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message ?? "Your request could not be submitted.");
        return;
      }
      setSubmitted(true);
      formElement.reset();
    } catch {
      setError("Your request could not be submitted. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) return <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">Your request and preferred callback time were sent to the Clientflow team. This is a callback request, not a confirmed appointment. We can use your email if we cannot reach you by phone.</p>;

  return <form onSubmit={submit} aria-busy={pending} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
    <label className="block text-sm font-medium">Your name
      <input name="name" required maxLength={100} autoComplete="name" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
    </label>
    <label className="block text-sm font-medium">Phone number
      <input name="phone" type="tel" required maxLength={32} autoComplete="tel" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
    </label>
    <label className="block text-sm font-medium">Fallback email
      <input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
    </label>
    <p className="text-sm text-slate-500">We will use this email if we cannot reach you by phone.</p>
    <label className="block text-sm font-medium">Business name (optional)
      <input name="businessName" maxLength={120} autoComplete="organization" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
    </label>
    <label className="block text-sm font-medium">What website and CRM does your business need?
      <textarea name="description" required minLength={20} maxLength={3000} rows={6} className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
    </label>
    <fieldset className="space-y-3 border-t border-slate-200 pt-4">
      <legend className="font-semibold">Preferred callback</legend>
      <p className="text-sm leading-6 text-slate-500">Choose when you would like us to call. This requests a time; it does not reserve a confirmed appointment.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0 text-sm font-medium">Date
          <input name="callbackDate" type="date" required className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 p-3" />
        </label>
        <label className="block min-w-0 text-sm font-medium">Time
          <input name="callbackTime" type="time" required className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 p-3" />
        </label>
      </div>
      <label className="block text-sm font-medium">Time zone
        <input name="callbackTimeZone" required maxLength={100} list="callback-time-zones" value={timeZone} onChange={event => setTimeZone(event.target.value)} placeholder="America/New_York" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
        <datalist id="callback-time-zones">{["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Puerto_Rico", "Europe/London", "UTC"].map(zone => <option key={zone} value={zone} />)}</datalist>
      </label>
    </fieldset>
    <label aria-hidden="true" className="hidden">Leave this field empty
      <input name="website" tabIndex={-1} autoComplete="off" />
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="submit" disabled={pending} className="rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
      {pending ? "Sending request…" : "Request a consultation"}
    </button>
  </form>;
}
