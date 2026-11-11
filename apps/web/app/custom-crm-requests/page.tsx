import { currentUserId } from "@project/auth";
import { getUser, listCustomCrmRequests } from "@project/domain";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CustomCrmRequestsPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const user = await getUser(userId);
  if (!user?.isDeveloper) notFound();
  const requests = await listCustomCrmRequests(userId);

  return <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
    <Link href="/notifications" className="text-sm text-indigo-700 underline">Back to notifications</Link>
    <header>
      <p className="text-sm font-semibold text-indigo-700">Developer workspace</p>
      <h1 className="mt-1 text-3xl font-semibold">Custom CRM requests</h1>
      <p className="mt-2 text-sm text-slate-600">Tailored website and CRM consultations. Callback times are preferences, not confirmed appointments.</p>
      <Link href="/businesses/new" className="mt-3 inline-flex items-center justify-center rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Set up client portal</Link>
    </header>
    {requests.length ? <ul className="space-y-4">{requests.map(request =>
      <li key={request.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{request.name}{request.businessName ? ` · ${request.businessName}` : ""}</h2>
            <p className="text-sm">Phone: {request.phone ? <a href={`tel:${request.phone.replace(/[^+\d]/g, "")}`} className="text-indigo-700 underline">{request.phone}</a> : "Not provided"}</p>
            <p className="text-sm">Fallback email: <a href={`mailto:${request.email}`} className="text-indigo-700 underline">{request.email}</a></p>
          </div>
          <time dateTime={request.createdAt.toISOString()} className="text-xs text-slate-500">{request.createdAt.toLocaleString()}</time>
        </div>
        <p className="text-sm text-slate-600">Preferred callback: {request.callbackAt && request.callbackTimeZone
          ? `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: request.callbackTimeZone }).format(request.callbackAt)} (${request.callbackTimeZone})`
          : "Not provided"}</p>
        <p className="whitespace-pre-wrap break-words border-t border-slate-100 pt-3 text-sm leading-6 text-slate-700">{request.description}</p>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <Link href={`/businesses/new?requestId=${encodeURIComponent(request.id)}`} className="inline-flex items-center justify-center rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Set up portal</Link>
          <p className="text-xs text-slate-500">After consultation · Review details before creating the owner account.</p>
        </div>
      </li>)}</ul> : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">No custom CRM requests have arrived.</p>}
  </main>;
}
