"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  addCustomerNoteAction,
  type AddCustomerNoteActionState,
} from "./actions";

const initialState: AddCustomerNoteActionState = {};

export function NoteForm({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState(
    addCustomerNoteAction,
    initialState,
  );
  const contentError = state.fieldErrors?.content?.[0];

  return (
    <form
      action={formAction}
      noValidate
      aria-busy={pending}
      className="space-y-4 rounded-lg border border-neutral-200 p-5"
    >
      <input type="hidden" name="customerId" value={customerId} />

      <div>
        <div className="mb-1 flex items-center justify-between gap-4">
          <label htmlFor="content" className="block text-sm font-medium">
            Add a note
          </label>
          <Link
            href={`/customers/${customerId}/appointments/new`}
            className="text-sm text-blue-600 underline underline-offset-2"
          >
            Schedule
          </Link>
        </div>
        <p id="content-help" className="mb-2 text-sm text-neutral-600">
          Your employee name and the time saved will appear with this note.
        </p>
        <textarea
          id="content"
          name="content"
          rows={5}
          maxLength={2_000}
          defaultValue={state.value}
          aria-invalid={Boolean(contentError)}
          aria-describedby={
            contentError ? "content-help content-error" : "content-help"
          }
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
        {contentError ? (
          <p id="content-error" className="mt-1 text-sm text-red-700">
            {contentError}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {state.error.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-live="polite">
          {pending ? "Saving note..." : "Save note"}
        </span>
      </button>
    </form>
  );
}
