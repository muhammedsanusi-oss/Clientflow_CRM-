"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-2xl space-y-4 px-5 py-10"><h1 className="text-2xl font-semibold">The business form could not be loaded</h1><p>Try loading it again.</p><button onClick={reset} className="rounded-lg bg-indigo-700 px-4 py-2 text-white">Try again</button></main>;
}
