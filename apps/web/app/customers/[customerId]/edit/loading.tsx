export default function EditCustomerLoading() {
  return <main role="status" aria-label="Loading customer editor" className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
    <div className="h-96 animate-pulse rounded bg-neutral-100" />
  </main>;
}
