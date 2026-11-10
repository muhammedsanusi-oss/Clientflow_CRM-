/*
 * Code guide: apps/web/app/businesses/[id]/website/error.tsx
 * Next.js client error boundary for this route. Shows a safe failure and a Try again control that asks
 * Next.js to rerender; it does not modify business records.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";
/*
 * Automatic client error display for this route. The retry button calls reset to request another render.
 */
export default function WebsiteError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl space-y-4 px-5 py-12"><h1 className="text-2xl font-semibold">Website unavailable</h1><p role="alert">We could not load this website. Try again.</p><button onClick={reset} className="rounded-xl bg-indigo-700 px-4 py-2 text-white">Try again</button></main>;
}
