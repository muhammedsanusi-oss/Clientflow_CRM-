/*
 * Code guide: apps/web/app/businesses/[id]/website/loading.tsx
 * Next.js route loading placeholder while the surrounding page resolves its data. No records are read or
 * changed by this visual skeleton.
 */
/*
 * Automatic loading UI for this route while its page is waiting for server data; no business records are
 * changed.
 */
export default function Loading() {
  return <main className="mx-auto max-w-7xl space-y-6 px-5 py-12" aria-busy="true" aria-label="Loading website editor"><div className="h-10 w-64 animate-pulse rounded bg-slate-200" /><div className="h-96 animate-pulse rounded-2xl bg-slate-100" /></main>;
}
