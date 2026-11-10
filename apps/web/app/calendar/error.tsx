/*
 * Code guide: apps/web/app/calendar/error.tsx
 * Next.js client error boundary for this route. Shows a safe failure and a Try again control that asks
 * Next.js to rerender; it does not modify business records.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";

/*
 * Automatic client error display for this route. The retry button calls reset to request another render.
 */
export default function CalendarError({ reset }: { reset: () => void }) {
  return (
    <main className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h1 className="font-semibold text-red-900">
        Calendar could not be loaded
      </h1>
      <p className="mt-2 text-sm text-red-700">
        Check the database connection and try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded bg-red-700 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </main>
  );
}
