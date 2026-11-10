/*
 * Code guide: apps/web/app/customers/[customerId]/page.tsx
 * Customer contact details and shared notes. Users can edit this customer, add a note, or follow the Schedule
 * link; the server first verifies access to the customer business.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { redirect } from "next/navigation";
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
 */
import { notFound } from "next/navigation";

/*
 * Import connection: ./note-form -> apps/web/app/customers/[customerId]/note-form.tsx.
 * NoteForm: Browser form that saves a note through addCustomerNoteAction. Carries the customer lookup ID and
 * shows validation/pending states; authorship is derived on the server.
 */
import { NoteForm } from "./note-form";
import { OwnerWorkspace } from "../../../components/owner-workspace";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

const noteDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/*
 * Customer contact details and shared notes. Users can edit this customer, add a note, or follow the Schedule
 * link; the server first verifies access to the customer business.
 */
export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const customer = await getCustomerWithNotesForUser(userId, customerId);

  if (!customer) {
    notFound();
  }

  const page = (
    <main className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <Link
          href={`/customers?businessId=${encodeURIComponent(customer.business_id)}`}
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Back to customers
        </Link>
        <h1 className="text-2xl font-bold">
          {customer.first_name} {customer.last_name}
        </h1>
        <p className="text-sm text-neutral-600">Business: {customer.business.name}</p>
        <Link href={`/customers/${customer.id}/edit`} className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">Edit customer</Link>
      </header>

      <section
        aria-labelledby="customer-details-heading"
        className="rounded-lg border border-neutral-200 p-5"
      >
        <h2 id="customer-details-heading" className="font-semibold">
          Customer details
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Email</dt>
            <dd>
              <a className="text-blue-600 hover:underline" href={`mailto:${customer.email}`}>
                {customer.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Phone</dt>
            <dd>
              <a className="text-blue-600 hover:underline" href={`tel:${customer.phone_number}`}>
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
      </section>

      <NoteForm customerId={customer.id} />

      <section aria-labelledby="notes-heading" className="space-y-4">
        <div>
          <h2 id="notes-heading" className="text-xl font-semibold">
            Customer notes
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            A shared record of employee conversations and customer context.
          </p>
        </div>

        {customer.notes.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
            <p className="text-sm text-neutral-600">
              No notes have been added for this customer.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {customer.notes.map((note) => (
              <li
                key={note.id}
                className="rounded-lg border border-neutral-200 p-5"
              >
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                <p className="mt-4 text-xs text-neutral-500">
                  Saved by {note.employee.first_name} {note.employee.last_name}{" "}
                  on{" "}
                  <time dateTime={note.note_date.toISOString()}>
                    {noteDateFormatter.format(note.note_date)}
                  </time>
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
  return <OwnerWorkspace
    business={{ id: customer.business_id, ...customer.business }}
    active="customers"
  >{page}</OwnerWorkspace>;
}
