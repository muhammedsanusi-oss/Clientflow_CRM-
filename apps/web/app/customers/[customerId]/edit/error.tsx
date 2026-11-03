"use client";

export default function EditCustomerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main role="alert" className="mx-auto max-w-3xl space-y-4 rounded-lg border border-red-200 bg-red-50 p-6">
    <h1 className="font-semibold text-red-900">Customer could not be loaded</h1>
    <p>Try loading the customer again.</p>
    <button onClick={reset} className="rounded bg-red-700 px-4 py-2 text-white">Try again</button>
  </main>;
}
