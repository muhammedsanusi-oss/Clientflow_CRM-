"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CustomerFormInput } from "@project/domain";
import { editCustomerAction, type EditCustomerState } from "./actions";

const fields = [
  { name: "firstName", label: "First name", type: "text", autoComplete: "given-name", maxLength: 100 },
  { name: "lastName", label: "Last name", type: "text", autoComplete: "family-name", maxLength: 100 },
  { name: "phoneNumber", label: "Phone number", type: "tel", autoComplete: "tel", maxLength: 30 },
  { name: "email", label: "Email", type: "email", autoComplete: "email", maxLength: 254 },
  { name: "address", label: "Address", type: "text", autoComplete: "street-address", maxLength: 500 },
] as const;

export function CustomerEditForm({ customerId, initialValues }: { customerId: string; initialValues: CustomerFormInput }) {
  const [state, action, pending] = useActionState(editCustomerAction, {} as EditCustomerState);
  const values = state.values ?? initialValues;
  const contactError = state.fieldErrors?.preferredContactMethod?.[0];
  return (
    <form action={action} noValidate aria-busy={pending} className="space-y-5">
      <input type="hidden" name="customerId" value={customerId} />
      {state.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.error.message}</p>}
      {fields.map((field) => {
        const error = state.fieldErrors?.[field.name]?.[0];
        return <div key={field.name}>
          <label htmlFor={field.name} className="mb-1 block text-sm font-medium">{field.label}</label>
          <input {...field} id={field.name} required defaultValue={values[field.name]} aria-invalid={Boolean(error)} aria-describedby={error ? `${field.name}-error` : undefined} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
          {error && <p id={`${field.name}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
        </div>;
      })}
      <div>
        <label htmlFor="preferredContactMethod" className="mb-1 block text-sm font-medium">Preferred contact method</label>
        <select id="preferredContactMethod" name="preferredContactMethod" defaultValue={values.preferredContactMethod} aria-invalid={Boolean(contactError)} aria-describedby={contactError ? "contact-error" : undefined} className="w-full rounded-lg border border-neutral-300 px-3 py-2">
          <option value="PHONE">Phone</option><option value="EMAIL">Email</option><option value="TEXT">Text</option>
        </select>
        {contactError && <p id="contact-error" className="mt-1 text-sm text-red-700">{contactError}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"><span aria-live="polite">{pending ? "Saving changes..." : "Save changes"}</span></button>
        <Link href={`/customers/${customerId}`} className="text-sm text-neutral-700 underline">Cancel</Link>
      </div>
    </form>
  );
}
