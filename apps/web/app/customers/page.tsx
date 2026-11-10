/*
 * Code guide: apps/web/app/customers/page.tsx
 * Owner workspace at /customers. Select an accessible business, search customers by name/email/phone, add a
 * customer, open customer details, and navigate to calendar, inquiries, or website.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * redirect: Ends this server response with navigation to the supplied application route.
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 */
import { redirect, notFound } from "next/navigation";
  /*
   * Import connection: next/link.
   * Next.js Link renders application navigation links; it does not itself authorize a destination or write
   * data.
   * Link: Client-side application navigation component; the destination still performs its own access checks.
   */
  import Link from "next/link";
  /*
   * Import connection: @project/auth -> packages/auth/src/index.ts.
   * currentUserId: Resolves the current database session and returns its user ID only for a regular,
   * unexpired session. Activation-only tickets cannot authorize private CRM operations. Defined in
   * packages/auth/src/current-user.ts.
   */
  import { currentUserId } from "@project/auth";
  /*
   * Import connection: @project/domain -> packages/domain/src/index.ts.
   * listCustomersForUser: Adapts the authorized customer collection to a list for the customer page, using an
   * empty list when no collection is available. Defined in packages/domain/src/customers.ts.
   * getCustomerBusinessForUser: Resolves the selected business through the user active membership, or chooses
   * the newest authorized business when no selection is supplied. Defined in
   * packages/domain/src/customers.ts.
   * listBusinesses: Reads the resource through the connected query module; the business/user predicates are
   * implemented there. Defined in packages/domain/src/queries/business.ts.
   * customerSearchInputSchema: Trims and limits the customer search query before building database filters.
   * Defined in packages/domain/src/customers.ts.
   */
  import { listCustomersForUser, getCustomerBusinessForUser, listBusinesses, customerSearchInputSchema } from "@project/domain";
  /*
   * Import connection: ./business-selector -> apps/web/app/customers/business-selector.tsx.
   * BusinessSelector: GET form that changes the businessId query parameter on /customers. The selection is a
   * lookup hint; the destination page verifies the user membership again.
   */
  import { BusinessSelector } from "./business-selector";
  import { OwnerWorkspace } from "../../components/owner-workspace";

  // Request-time rendering: the page/API is resolved for this request instead of serving one static response
  // for every user.
  export const dynamic = "force-dynamic";

  /*
   * Owner workspace at /customers. Select an accessible business, search customers by name/email/phone, add a
   * customer, open customer details, and navigate to calendar, inquiries, or website.
   */
  export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[]; q?: string | string[] }> }) {
    // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
    // not trusted here.
    const userId = await currentUserId();
  if (!userId) redirect("/login");
    const parameters = await searchParams;
    const requested = parameters.businessId;
    const search = customerSearchInputSchema.safeParse(parameters.q);
    const query = search.success ? search.data : "";
    const businessId = requested === undefined ? undefined : typeof requested === "string" ? requested : "";
    const [businesses, business] = await Promise.all([listBusinesses(userId), getCustomerBusinessForUser(userId, businessId)]);
    if (businessId !== undefined && !business) notFound();
    if (!business) return <main className="mx-auto max-w-3xl space-y-5 px-5 py-10"><Link href="/" className="text-indigo-700 underline">Back to dashboard</Link><h1 className="text-2xl font-semibold">Create a business to add customers</h1><p>Customers need a business. Create yours first, then add customers linked to it.</p><Link href="/businesses/new" className="inline-block rounded-lg bg-indigo-700 px-4 py-2 text-white">Create business</Link></main>;
    const customers = search.success ? await listCustomersForUser(userId, business.id, query) : [];
    const selectedQuery = `?businessId=${encodeURIComponent(business.id)}`;

    const page = (
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10">
        <header className="space-y-2">
          <Link
            href="/"
            className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white"
          >
            ← Dashboard
          </Link>

          <h1 className="text-2xl font-bold">{business.name}</h1>
          {business.description && <p className="text-sm text-slate-600">{business.description}</p>}

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
        <nav aria-label="Business website" className="flex flex-wrap gap-3"><Link href={`/inquiries${selectedQuery}`} className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">Website inquiries</Link>{business.websiteTemplate && <><Link href={`/website${selectedQuery}`} className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">Website</Link><Link href={`/sites/${business.id}`} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-indigo-700">Open website</Link></>}</nav>
        <BusinessSelector businesses={businesses} selectedId={business.id} />

        <form method="get" action="/customers" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="businessId" value={business.id} />
          <div className="flex-1">
            <label htmlFor="customer-search" className="mb-1 block text-sm font-medium">Search customers</label>
            <input id="customer-search" type="search" name="q" defaultValue={search.success ? query : typeof parameters.q === "string" ? parameters.q : ""} maxLength={100} aria-invalid={!search.success} aria-describedby="search-help" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
            <p id="search-help" className="mt-1 text-sm text-neutral-600">Search by name, email, or phone number.</p>
          </div>
          <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">Search</button>
          <Link href={`/customers${selectedQuery}`} className="text-sm text-blue-700 underline">Clear search</Link>
        </form>

        {!search.success ? <p role="alert" className="text-sm text-red-700">Enter one search query of 100 characters or fewer.</p> : customers.length === 0 ? (
          <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
            <h2 className="font-semibold">No customers found</h2>
            <p className="mt-2 text-sm text-neutral-600">
              {query ? "No customers match your search. Clear the search to see all customers." : "Your business does not have any customer records yet."}
            </p>
            <Link
              href={`/customers${selectedQuery}`}
              className="mt-4 inline-block text-blue-600 underline underline-offset-2"
            >
              {query ? "Clear search" : "Refresh customer list"}
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
    return <OwnerWorkspace business={business} active="customers">{page}</OwnerWorkspace>;
  }
