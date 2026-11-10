/*
 * Code guide: apps/web/app/customers/loading.tsx
 * Next.js route loading placeholder while the surrounding page resolves its data. No records are read or
 * changed by this visual skeleton.
 */
/*
 * Automatic loading UI for this route while its page is waiting for server data; no business records are
 * changed.
 */
export default function CustomersLoading() {
    return (
      <main className="space-y-6" role="status" aria-label="Loading customers">
        <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />

        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-lg bg-neutral-100"
          />
        ))}
      </main>
    );
  }