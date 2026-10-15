export default function CustomerDetailLoading() {
  return (
    <main
      className="mx-auto max-w-3xl space-y-6"
      role="status"
      aria-label="Loading customer notes"
    >
      <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
      <div className="h-40 animate-pulse rounded-lg bg-neutral-100" />
      <div className="h-48 animate-pulse rounded-lg bg-neutral-100" />
      <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
    </main>
  );
}
