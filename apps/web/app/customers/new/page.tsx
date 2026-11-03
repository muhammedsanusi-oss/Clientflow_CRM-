import Link from "next/link";
import { currentUserId } from "@project/auth";
import { redirect, notFound } from "next/navigation";
import { getCustomerBusinessForUser, listBusinesses } from "@project/domain";

import { CustomerForm } from "./customer-form";

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const requested = (await searchParams).businessId;
  const businessId = requested === undefined ? undefined : typeof requested === "string" ? requested : "";
  const [businesses, business] = await Promise.all([listBusinesses(userId), getCustomerBusinessForUser(userId, businessId)]);
  if (businessId !== undefined && !business) notFound();
  const customersHref = business ? `/customers?businessId=${encodeURIComponent(business.id)}` : "/customers";
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-5 py-10">
      <header className="space-y-2">
        <Link
          href={customersHref}
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Back to customers
        </Link>

        <h1 className="text-2xl font-bold">Add customer</h1>

        <p className="text-sm text-neutral-600">
          {business ? `Add a customer to ${business.name}, or choose another business below.` : "Create a business first so your customer can be linked to it."}
        </p>
      </header>

      {business ? <CustomerForm businesses={businesses} selectedBusinessId={business.id} /> : <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-6"><h2 className="font-semibold">A business is required</h2><p className="mt-2 text-sm text-slate-600">Create your business, then select it when adding a customer.</p><Link href="/businesses/new" className="mt-4 inline-block rounded-lg bg-indigo-700 px-4 py-2 text-white">Create business</Link></section>}
    </main>
  );
}
