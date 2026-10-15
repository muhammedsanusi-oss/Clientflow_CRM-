"use client";

import { useActionState } from "react";
import Link from "next/link";
import { addBusinessAction, type BusinessActionState } from "./actions";

const initialState: BusinessActionState = {};
const fields = [
  { name: "name", label: "Business name", type: "text", autoComplete: "organization", maxLength: 100 },
  { name: "first_name", label: "Owner first name", type: "text", autoComplete: "given-name", maxLength: 50 },
  { name: "last_name", label: "Owner last name", type: "text", autoComplete: "family-name", maxLength: 50 },
  { name: "email", label: "Business email", type: "email", autoComplete: "email", maxLength: 254 },
  { name: "phone_number", label: "Business phone number", type: "tel", autoComplete: "tel", maxLength: 15 },
] as const;

export function BusinessForm() {
  const [state, action, pending] = useActionState(addBusinessAction, initialState);
  const typeError = state.fieldErrors?.business_type?.[0];
  return (
    <form action={action} noValidate aria-busy={pending} className="space-y-6">
      {state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.error.message}</p>}
      {fields.map(field => {
        const error = state.fieldErrors?.[field.name]?.[0];
        return <div key={field.name}>
          <label htmlFor={field.name} className="mb-1 block text-sm font-medium">{field.label}</label>
          <input id={field.name} name={field.name} type={field.type} autoComplete={field.autoComplete} maxLength={field.maxLength} required defaultValue={state.values?.[field.name]} aria-invalid={Boolean(error)} aria-describedby={error ? `${field.name}-error` : field.name === "phone_number" ? "phone-help" : undefined} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />
          {field.name === "phone_number" && <p id="phone-help" className="mt-1 text-xs text-slate-500">Enter 10–15 characters, including country code if needed.</p>}
          {error && <p id={`${field.name}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
        </div>;
      })}
      <div>
        <label htmlFor="business_type" className="mb-1 block text-sm font-medium">Business type</label>
        <select id="business_type" name="business_type" required defaultValue={state.values?.business_type ?? "OTHER"} aria-invalid={Boolean(typeError)} aria-describedby={typeError ? "business-type-error" : undefined} className="w-full rounded-xl border border-slate-300 px-3 py-2">
          <option value="SPA">Spa</option><option value="SALON">Salon</option><option value="CLINIC">Clinic</option><option value="BARBERSHOP">Barbershop</option><option value="OTHER">Other</option>
        </select>
        {typeError && <p id="business-type-error" className="mt-1 text-sm text-red-700">{typeError}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button disabled={pending} className="rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"><span aria-live="polite">{pending ? "Creating business..." : "Create business"}</span></button>
        <Link href="/" className="text-sm text-slate-600 underline">Cancel</Link>
      </div>
    </form>
  );
}
