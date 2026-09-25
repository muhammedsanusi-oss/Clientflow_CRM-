"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  addCustomerAction,
  type AddCustomerActionState,
} from "../actions";

const initialState: AddCustomerActionState = {};

const textFields = [
  {
    name: "firstName",
    label: "First name",
    type: "text",
    autoComplete: "given-name",
  },
  {
    name: "lastName",
    label: "Last name",
    type: "text",
    autoComplete: "family-name",
  },
  {
    name: "phoneNumber",
    label: "Phone number",
    type: "tel",
    autoComplete: "tel",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    autoComplete: "email",
  },
] as const;

export function CustomerForm() {
  const [state, formAction, pending] = useActionState(
    addCustomerAction,
    initialState,
  );

  const addressError = state.fieldErrors?.address?.[0];
  const contactError = state.fieldErrors?.preferredContactMethod?.[0];

  return (
    <form
      action={formAction}
      noValidate
      aria-busy={pending}
      className="space-y-6"
    >
      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {state.error.message}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {textFields.map((field) => {
          const error = state.fieldErrors?.[field.name]?.[0];
          const errorId = `${field.name}-error`;

          return (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className="mb-1 block text-sm font-medium"
              >
                {field.label}
              </label>

              <input
                id={field.name}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                defaultValue={state.values?.[field.name]}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              />

              {error ? (
                <p id={errorId} className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium">
          Address
        </label>

        <textarea
          id="address"
          name="address"
          rows={3}
          autoComplete="street-address"
          defaultValue={state.values?.address}
          aria-invalid={Boolean(addressError)}
          aria-describedby={addressError ? "address-error" : undefined}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />

        {addressError ? (
          <p id="address-error" className="mt-1 text-sm text-red-700">
            {addressError}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="preferredContactMethod"
          className="mb-1 block text-sm font-medium"
        >
          Preferred contact method
        </label>

        <select
          id="preferredContactMethod"
          name="preferredContactMethod"
          defaultValue={state.values?.preferredContactMethod ?? "EMAIL"}
          aria-invalid={Boolean(contactError)}
          aria-describedby={
            contactError ? "preferred-contact-method-error" : undefined
          }
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        >
          <option value="PHONE">Phone</option>
          <option value="EMAIL">Email</option>
          <option value="TEXT">Text</option>
        </select>

        {contactError ? (
          <p
            id="preferred-contact-method-error"
            className="mt-1 text-sm text-red-700"
          >
            {contactError}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-live="polite">
            {pending ? "Adding customer..." : "Add customer"}
          </span>
        </button>

        <Link
          href="/customers"
          className="text-sm text-neutral-700 underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
