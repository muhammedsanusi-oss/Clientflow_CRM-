import Link from "next/link";

export default function CustomerNotFound() {
  return (
    <main className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
      <h1 className="font-semibold">Customer not found</h1>
      <p className="mt-2 text-sm text-neutral-600">
        This customer is unavailable or does not exist.
      </p>
      <Link
        href="/customers"
        className="mt-4 inline-block text-sm text-blue-600 underline underline-offset-2"
      >
        Back to customers
      </Link>
    </main>
  );
}
