import { currentUserId } from "../../../../packages/auth/src/index";
import { listOwnerInquiries } from "../../../../packages/domain/src/index";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const userId = await currentUserId(); if (!userId) redirect("/login");
  const { businessId } = await searchParams;
  if (businessId !== undefined && typeof businessId !== "string") notFound();
  const result = await listOwnerInquiries(userId, businessId).catch(() => null);
  if (!result) notFound();
  return <main className="mx-auto max-w-4xl space-y-7 px-5 py-12">
    <Link href={`/customers?businessId=${encodeURIComponent(result.business.id)}`} className="text-sm text-indigo-700 underline">Back to business portal</Link>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-slate-500">{result.business.name}</p><h1 className="mt-2 text-3xl font-semibold">Website inquiries</h1><p className="mt-2 text-sm text-slate-600">Messages from the contact form on your website.</p></div>
      {result.business.websiteTemplate && <Link href={`/sites/${result.business.id}`} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-indigo-700">Open website ↗</Link>}
    </header>
    {result.inquiries.length === 0 ? <section className="rounded-2xl border border-dashed border-slate-300 p-10 text-center"><h2 className="font-semibold">No messages yet</h2><p className="mt-2 text-sm text-slate-500">Send a test message from your website&apos;s contact form to try it.</p></section> : <div className="space-y-4">{result.inquiries.map(inquiry => <article key={inquiry.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{inquiry.name}</h2><a href={`mailto:${inquiry.email}`} className="text-sm text-indigo-700 underline">{inquiry.email}</a>{inquiry.phone && <p className="mt-1 text-sm text-slate-600">{inquiry.phone}</p>}</div><time dateTime={inquiry.createdAt.toISOString()} className="text-xs text-slate-500">{inquiry.createdAt.toLocaleString()}</time></div>
      <p className="mt-5 whitespace-pre-wrap break-words border-t border-slate-100 pt-4 text-sm leading-7 text-slate-700">{inquiry.message}</p>
    </article>)}</div>}
  </main>;
}
