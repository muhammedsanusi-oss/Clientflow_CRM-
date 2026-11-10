/*
 * Code guide: apps/web/app/customers/[customerId]/loading.tsx
 * Next.js route loading placeholder while the surrounding page resolves its data. No records are read or
 * changed by this visual skeleton.
 */
/*
 * Automatic loading UI for this route while its page is waiting for server data; no business records are
 * changed.
 */
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
