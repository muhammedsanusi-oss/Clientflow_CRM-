/*
 * Code guide: apps/web/app/customers/[customerId]/note-form.tsx
 * Browser form that saves a note through addCustomerNoteAction. Carries the customer lookup ID and shows
 * validation/pending states; authorship is derived on the server.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";

/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "next/link";
/*
 * Import connection: react.
 * React provides browser component rendering and state/form hooks; database access remains in server/domain
 * functions.
 * useActionState: Connects a form to a Server Action and exposes its returned errors/receipt plus pending
 * status.
 */
import { useActionState } from "react";

/*
 * Import connection: ./actions -> apps/web/app/customers/[customerId]/actions.ts.
 * addCustomerNoteAction: Validates note input, saves it with server-derived authorship, refreshes customer
 * details, and redirects back to the customer.
 * Type AddCustomerNoteActionState: Type for retained note text and note-submission errors.
 */
import {
  addCustomerNoteAction,
  type AddCustomerNoteActionState,
} from "./actions";

// Initial browser form/action state before any submission; later validation messages and receipts come from
// the server action.
const initialState: AddCustomerNoteActionState = {};

/*
 * Browser form that saves a note through addCustomerNoteAction. Carries the customer lookup ID and shows
 * validation/pending states; authorship is derived on the server.
 */
export function NoteForm({ customerId }: { customerId: string }) {
  // Connect the form to its imported Server Action: state contains the returned values/errors, the action
  // submits, and pending disables duplicate clicks.
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
