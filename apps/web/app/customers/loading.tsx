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