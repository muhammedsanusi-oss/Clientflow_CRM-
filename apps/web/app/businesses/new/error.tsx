/*
 * Code guide: apps/web/app/businesses/new/error.tsx
 * Next.js client error boundary for this route. Shows a safe failure and a Try again control that asks
 * Next.js to rerender; it does not modify business records.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";

/*
 * Automatic client error display for this route. The retry button calls reset to request another render.
 */
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-2xl space-y-4 px-5 py-10"><h1 className="text-2xl font-semibold">The business form could not be loaded</h1><p>Try loading it again.</p><button onClick={reset} className="rounded-lg bg-indigo-700 px-4 py-2 text-white">Try again</button></main>;
}
