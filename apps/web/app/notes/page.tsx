import { currentUserId } from "@project/auth";
import {
  getCustomerBusinessForUser,
  listBusinessNotesForUser,
} from "@project/domain";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { OwnerWorkspace } from "../../components/owner-workspace";

export const dynamic = "force-dynamic";

const noteDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function BusinessNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string | string[] }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const parameters = await searchParams;
  const requested = parameters.businessId;
  const businessId =
    requested === undefined
      ? undefined
      : typeof requested === "string"
        ? requested
        : "";
  const business = await getCustomerBusinessForUser(userId, businessId);
  if (!business) notFound();

  const notes = await listBusinessNotesForUser(userId, business.id);
  const customersHref = `/customers?businessId=${encodeURIComponent(business.id)}`;

  const page = (
    <main className="mx-auto max-w-4xl space-y-8 px-5 py-10">
      <header className="space-y-3">
        <Link href={`/calendar?businessId=${encodeURIComponent(business.id)}`} className="text-sm text-blue-700 underline">
          Business dashboard
        </Link>
        <h1 className="text-2xl font-bold">{business.name} notes</h1>
        <p className="text-sm text-slate-600">
          Shared customer notes for {business.name}. Keep notes factual and
          business-related; authorized team members can read them.
        </p>
        <Link
          href={customersHref}
          className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white"
        >
          View customers
        </Link>
      </header>

      <section aria-label="Business customer notes" className="space-y-4">
        {notes.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h2 className="font-semibold">No notes yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Add a note from a customer profile to see it here.
            </p>
            <Link
              href={customersHref}
              className="mt-4 inline-block text-sm text-blue-700 underline"
            >
              Go to customers
            </Link>
          </div>
        ) : (
          <ol className="space-y-4">
            {notes.map((note) => (
              <li
                key={note.id}
                className="space-y-3 rounded-lg border border-slate-200 p-5"
              >
                <h2 className="font-semibold">
                  <Link
                    href={`/customers/${note.customer.id}`}
                    className="text-blue-700 underline underline-offset-2"
                  >
                    {note.customer.first_name} {note.customer.last_name}
                  </Link>
                </h2>
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                <p className="text-xs text-slate-500">
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
  return <OwnerWorkspace business={business}>{page}</OwnerWorkspace>;
}
