/*
 * Code guide: apps/web/app/calendar/loading.tsx
 * Next.js route loading placeholder while the surrounding page resolves its data. No records are read or
 * changed by this visual skeleton.
 */
/*
 * Automatic loading UI for this route while its page is waiting for server data; no business records are
 * changed.
 */
export default function CalendarLoading() {
  return (
    <main className="space-y-6" role="status" aria-label="Loading calendar">
      <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="h-10 animate-pulse rounded bg-neutral-100" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded bg-neutral-100"
          />
        ))}
      </div>
    </main>
  );
}
