"use client";

import { useActionState, useEffect, useState } from "react";
import { addOwnerLocationAction } from "./actions";

const empty = { name: "", address: "", phone_number: "", email: "" };
export function LocationForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(addOwnerLocationAction, {});
  const [values, setValues] = useState(empty);
  useEffect(() => { if (state.savedId) setValues(empty); }, [state.savedId]);
  const fields = [
    { key: "name", label: "Location name", max: 100, required: true },
    { key: "address", label: "Street address", max: 300, required: true },
    { key: "phone_number", label: "Phone (optional)", max: 30, type: "tel" },
    { key: "email", label: "Email (optional)", max: 254, type: "email" },
  ] as const;
  return <form action={action} className="space-y-4">
    <input type="hidden" name="businessId" value={businessId} />
    {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    {state.savedId && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Location added. It is now available for appointments.</p>}
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
      <legend className="sr-only">New business location</legend>
      {fields.map(field => <label key={field.key} className="text-sm font-medium">{field.label}
        <input name={field.key} type={"type" in field ? field.type : "text"} required={"required" in field && field.required}
          maxLength={field.max} value={values[field.key]} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))}
          aria-invalid={!!state.fieldErrors?.[field.key]} aria-describedby={state.fieldErrors?.[field.key] ? `location-${field.key}-error` : undefined}
          className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
        {state.fieldErrors?.[field.key] && <span id={`location-${field.key}-error`} className="mt-1 block text-red-700">{state.fieldErrors[field.key]?.join(" ")}</span>}
      </label>)}
      <button className="rounded-lg bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60 sm:col-span-2">{pending ? "Adding location..." : "Add location"}</button>
    </fieldset>
  </form>;
}
