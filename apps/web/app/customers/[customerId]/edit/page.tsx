/*
 * Code guide: apps/web/app/customers/[customerId]/edit/page.tsx
 * Loads an authorized customer and supplies current editable contact fields to CustomerEditForm. Foreign and
 * unknown customer IDs share the not-found result.
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
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { notFound, redirect } from "next/navigation";
/*
 * Import connection: @project/auth -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "@project/auth";
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * getCustomerWithNotesForUser: Loads an authorized customer and the allowed shared notes plus author display
 * names for the detail and edit pages. Defined in packages/domain/src/customers.ts.
 */
import { getCustomerWithNotesForUser } from "@project/domain";
/*
 * Import connection: ./customer-edit-form -> apps/web/app/customers/[customerId]/edit/customer-edit-form.tsx.
 * CustomerEditForm: Edits customer contact fields through editCustomerAction. Ownership fields are not
 * editable; failed validation keeps the submitted values visible.
 */
import { CustomerEditForm } from "./customer-edit-form";
import { OwnerWorkspace } from "../../../../components/owner-workspace";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

/*
 * Loads an authorized customer and supplies current editable contact fields to CustomerEditForm. Foreign and
 * unknown customer IDs share the not-found result.
 */
export default async function EditCustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { customerId } = await params;
  const customer = await getCustomerWithNotesForUser(userId, customerId);
  if (!customer) notFound();
  return <OwnerWorkspace
    business={{ id: customer.business_id, ...customer.business }}
    active="customers"
  >
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Link href={`/customers/${customer.id}`} className="text-sm text-blue-700 underline">Back to customer</Link>
    <h1 className="text-2xl font-bold">Edit customer</h1>
    <p className="text-sm text-neutral-600">Business: {customer.business.name}</p>
    <CustomerEditForm customerId={customer.id} initialValues={{
      firstName: customer.first_name, lastName: customer.last_name,
      phoneNumber: customer.phone_number, email: customer.email,
      address: customer.address, preferredContactMethod: customer.preferred_contact_method,
    }} />
    </main>
  </OwnerWorkspace>;
}
