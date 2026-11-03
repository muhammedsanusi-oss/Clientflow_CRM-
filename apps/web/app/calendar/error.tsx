"use client";

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
