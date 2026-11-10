/*
 * Code guide: apps/web/app/customers/[customerId]/not-found.tsx
 * Next.js not-found display for an unavailable customer. Offers navigation back without confirming whether a
 * foreign customer exists.
 */
/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "next/link";

/*
 * Renders the safe customer-not-found screen and its navigation back to the customer list.
 */
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
