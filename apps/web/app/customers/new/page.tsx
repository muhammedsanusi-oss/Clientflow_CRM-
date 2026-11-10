/*
 * Code guide: apps/web/app/customers/new/page.tsx
 * Loads authorized businesses before showing the Add customer form. The selected business is verified on the
 * server; a user without a business sees a creation link.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "next/link";
/*
 * Import connection: @project/auth -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "@project/auth";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * redirect: Ends this server response with navigation to the supplied application route.
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 */
import { redirect, notFound } from "next/navigation";
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * getCustomerBusinessForUser: Resolves the selected business through the user active membership, or chooses
 * the newest authorized business when no selection is supplied. Defined in packages/domain/src/customers.ts.
 * listBusinesses: Reads the resource through the connected query module; the business/user predicates are
 * implemented there. Defined in packages/domain/src/queries/business.ts.
 */
import { getCustomerBusinessForUser, listBusinesses } from "@project/domain";

/*
 * Import connection: ./customer-form -> apps/web/app/customers/new/customer-form.tsx.
 * CustomerForm: Browser form for selecting a business and entering customer contact details. useActionState
 * submits to addCustomerAction and redisplays server validation/conflict errors.
 */
import { CustomerForm } from "./customer-form";
import { OwnerWorkspace } from "../../../components/owner-workspace";

/*
 * Loads authorized businesses before showing the Add customer form. The selected business is verified on the
 * server; a user without a business sees a creation link.
 */
export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const requested = (await searchParams).businessId;
  const businessId = requested === undefined ? undefined : typeof requested === "string" ? requested : "";
  const [businesses, business] = await Promise.all([listBusinesses(userId), getCustomerBusinessForUser(userId, businessId)]);
  if (businessId !== undefined && !business) notFound();
  const customersHref = business ? `/customers?businessId=${encodeURIComponent(business.id)}` : "/customers";
  const page = (
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
  return business
    ? <OwnerWorkspace business={business} active="customers">{page}</OwnerWorkspace>
    : page;
}
