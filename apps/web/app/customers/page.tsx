import { redirect, notFound } from "next/navigation";
  import Link from "next/link";
  import { currentUserId } from "@project/auth";
  import { listCustomersForUser, getCustomerBusinessForUser, listBusinesses } from "@project/domain";
  import { BusinessSelector } from "./business-selector";

  export const dynamic = "force-dynamic";

  export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
    const userId = await currentUserId();
  if (!userId) redirect("/login");
    const requested = (await searchParams).businessId;
    const businessId = requested === undefined ? undefined : typeof requested === "string" ? requested : "";
    const [businesses, business] = await Promise.all([listBusinesses(userId), getCustomerBusinessForUser(userId, businessId)]);
    if (businessId !== undefined && !business) notFound();
    if (!business) return <main className="mx-auto max-w-3xl space-y-5 px-5 py-10"><Link href="/" className="text-indigo-700 underline">Back to dashboard</Link><h1 className="text-2xl font-semibold">Create a business to add customers</h1><p>Customers need a business. Create yours first, then add customers linked to it.</p><Link href="/businesses/new" className="inline-block rounded-lg bg-indigo-700 px-4 py-2 text-white">Create business</Link></main>;
    const customers = await listCustomersForUser(userId, business.id);
    const selectedQuery = `?businessId=${encodeURIComponent(business.id)}`;

    return (
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10">
        <header className="space-y-2">
          <Link
            href="/"
            className="text-sm text-blue-600 underline underline-offset-2"
          >
            ← Dashboard
          </Link>

          <h1 className="text-2xl font-bold">Customers</h1>

          <p className="text-sm text-neutral-500">
            Customers linked to {business.name}.
          </p>

          <Link
            href={`/customers/new${selectedQuery}`}
            className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white"
          >
            Add customer
          </Link>
          <Link
            href="/calendar"
            className="ml-4 text-sm text-blue-600 underline underline-offset-2"
          >
            Calendar
          </Link>
        </header>
        <BusinessSelector businesses={businesses} selectedId={business.id} />

        {customers.length === 0 ? (
          <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
            <h2 className="font-semibold">No customers found</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Your business does not have any customer records yet.
            </p>
            <Link
              href={`/customers${selectedQuery}`}
              className="mt-4 inline-block text-blue-600 underline underline-offset-2"
            >
              Refresh customer list
            </Link>
          </section>
        ) : (
          <ul className="space-y-4">
            {customers.map((customer) => (
              <li
                key={customer.id}
                className="rounded-lg border border-neutral-200 p-5"
              >
                <h2 className="font-semibold">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="text-blue-700 underline-offset-2 hover:underline"
                  >
                    {customer.first_name} {customer.last_name}
                  </Link>
                </h2>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-neutral-500">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {customer.email}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Phone</dt>
                    <dd>
                      <a
                        href={`tel:${customer.phone_number}`}
                        className="text-blue-600 hover:underline"
                      >
                        {customer.phone_number}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Address</dt>
                    <dd>{customer.address}</dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Preferred contact</dt>
                    <dd>{customer.preferred_contact_method}</dd>
                  </div>
                </dl>

                <Link
                  href={`/customers/${customer.id}`}
                  className="mt-4 inline-block text-sm text-blue-600 underline underline-offset-2"
                >
                  View customer notes
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }
