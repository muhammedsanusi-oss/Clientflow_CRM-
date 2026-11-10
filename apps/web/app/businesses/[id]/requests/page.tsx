import { currentUserId } from "@project/auth";
import { DomainError, listDeveloperBusinessRequests } from "@project/domain";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BusinessRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { id } = await params;
  let result: Awaited<ReturnType<typeof listDeveloperBusinessRequests>>;
  try {
    result = await listDeveloperBusinessRequests(userId, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  return <main className="mx-auto max-w-4xl space-y-8 px-5 py-10">
    <Link href={`/businesses/${encodeURIComponent(id)}`} className="text-sm text-indigo-700 underline">Back to business</Link>
    <header>
      <p className="text-sm font-semibold text-indigo-700">{result.business.name}</p>
      <h1 className="mt-1 text-3xl font-semibold">Owner inquiries and requests</h1>
    </header>
    <section aria-labelledby="business-inquiries-heading" className="space-y-3">
      <h2 id="business-inquiries-heading" className="text-xl font-semibold">Website inquiries</h2>
      {result.inquiries.length ? <ul className="space-y-3">{result.inquiries.map(inquiry =>
        <li key={inquiry.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{inquiry.name}</h3><a href={`mailto:${inquiry.email}`} className="text-sm text-indigo-700 underline">{inquiry.email}</a>{inquiry.phone && <p className="text-sm text-slate-600">{inquiry.phone}</p>}</div><time dateTime={inquiry.createdAt.toISOString()} className="text-xs text-slate-500">{inquiry.createdAt.toLocaleString()}</time></div>
          <p className="mt-4 whitespace-pre-wrap break-words border-t border-slate-100 pt-3 text-sm leading-6">{inquiry.message}</p>
        </li>)}</ul> : <p className="text-sm text-slate-600">No website inquiries yet.</p>}
    </section>
    <section aria-labelledby="owner-feature-requests-heading" className="space-y-3">
      <h2 id="owner-feature-requests-heading" className="text-xl font-semibold">Website change requests</h2>
      {result.featureRequests.length ? <ul className="space-y-3">{result.featureRequests.map(request =>
        <li key={request.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{request.title}</h3><time dateTime={request.createdAt.toISOString()} className="text-xs text-slate-500">{request.createdAt.toLocaleString()}</time></div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{request.description}</p>
        </li>)}</ul> : <p className="text-sm text-slate-600">No website change requests yet.</p>}
    </section>
  </main>;
}
