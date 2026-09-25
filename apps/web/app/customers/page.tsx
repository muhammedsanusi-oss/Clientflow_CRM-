  import Link from "next/link";
  import { currentUserId } from "@project/auth";
  import { listCustomersForUser } from "@project/domain";

  export const dynamic = "force-dynamic";

  export default async function CustomersPage() {
    const userId = await currentUserId();
    const customers = await listCustomersForUser(userId);

    return (
      <main className="space-y-8">
        <header className="space-y-2">
          <Link
            href="/"
            className="text-sm text-blue-600 underline underline-offset-2"
          >
            ← Dashboard
          </Link>

          <h1 className="text-2xl font-bold">Customers</h1>

          <p className="text-sm text-neutral-500">
            Customers shared by every employee in your business.
          </p>

          <Link
            href="/customers/new"
            className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white"
          >
            Add customer
          </Link>
        </header>

        {customers.length === 0 ? (
          <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
            <h2 className="font-semibold">No customers found</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Your business does not have any customer records yet.
            </p>
            <Link
              href="/customers"
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
                  {customer.first_name} {customer.last_name}
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
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }
