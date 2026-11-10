export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10"
      role="status"
      aria-label="Loading page"
    >
      <p className="text-sm font-medium text-neutral-600">Loading page...</p>
      <div aria-hidden="true" className="space-y-6">
        <div className="h-9 w-56 animate-pulse rounded bg-neutral-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    </main>
  );
}
