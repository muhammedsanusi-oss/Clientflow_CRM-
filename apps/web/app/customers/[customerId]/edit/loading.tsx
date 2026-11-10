/*
 * Code guide: apps/web/app/customers/[customerId]/edit/loading.tsx
 * Next.js route loading placeholder while the surrounding page resolves its data. No records are read or
 * changed by this visual skeleton.
 */
/*
 * Automatic loading UI for this route while its page is waiting for server data; no business records are
 * changed.
 */
export default function EditCustomerLoading() {
  return <main role="status" aria-label="Loading customer editor" className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
    <div className="h-96 animate-pulse rounded bg-neutral-100" />
  </main>;
}
