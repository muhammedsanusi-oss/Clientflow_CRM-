import { currentUserId } from "@project/auth";
import { getCustomerWithNotesForUser } from "@project/domain";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NoteForm } from "./note-form";

export const dynamic = "force-dynamic";

const noteDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const userId = await currentUserId();
  const customer = await getCustomerWithNotesForUser(userId, customerId);

  if (!customer) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <Link
          href="/customers"
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Back to customers
        </Link>
        <h1 className="text-2xl font-bold">
          {customer.first_name} {customer.last_name}
        </h1>
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
}
