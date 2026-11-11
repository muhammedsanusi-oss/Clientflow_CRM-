import Link from "next/link";
import type { getManagedService } from "../../../packages/domain/src/managed-service";
import { ManagedRequestControls, ManagedRequestForm } from "./managed-service-controls";

export function ManagedServiceView({ data }: { data: Awaited<ReturnType<typeof getManagedService>> }) {
  const { business } = data;
  return <main className="mx-auto max-w-4xl space-y-6 px-5 py-16">
    <header className="space-y-2"><p className="text-sm text-indigo-700">{business.name}</p><h1 className="text-3xl font-bold text-[#172b4d]">Managed content changes</h1><p className="text-slate-600">Small updates to your existing website, handled by your developer.</p></header>
    <section className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-6" aria-label="Monthly service allowance">
      <h2 className="text-xl font-semibold">{data.month} · UTC monthly allowance</h2>
      <p className="text-2xl font-bold">{data.remaining} of 30 minutes available</p>
      <p>{data.used} minutes recorded this month. Resets {data.resetsAt.toISOString().slice(0, 10)} at 00:00 UTC. Unused minutes do not roll over.</p>
      {!business.eligible && <p className="font-semibold text-amber-900">An active Managed subscription is required to request or perform further included work. Your history remains available.</p>}
      {business.eligible && data.remaining === 0 && <p className="font-semibold text-amber-900">This month’s included time is used. You can submit requests for the next eligible month. Additional work requires a separate quote.</p>}
      <p className="text-sm">Demo workflow: no real charges. New features, redesigns, and extra work require a separate quote. Platform bug fixes and your own website edits never consume these minutes.</p>
      <Link className="inline-flex rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-indigo-700" href={`/subscription?businessId=${encodeURIComponent(business.id)}`}>Manage demo subscription</Link>
    </section>
    {business.isOwner && business.eligible && <ManagedRequestForm businessId={business.id} />}
    {business.isDeveloper && <p className="text-sm text-slate-600">Make and publish the requested changes in the <Link className="text-indigo-700 underline" href={`/businesses/${encodeURIComponent(business.id)}/website`}>website editor</Link>, then record the content-change time and completion note here. Status updates do not publish content.</p>}
    <section className="space-y-4"><h2 className="text-2xl font-semibold">Content requests</h2>
      {!data.requests.length && <p>No content-change requests yet.</p>}
      {data.requests.map(request => <article key={request.id} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3"><h3 className="break-words text-xl font-semibold">{request.title}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{request.status.replaceAll("_", " ")}</span></header>
        <p className="whitespace-pre-wrap break-words text-slate-700">{request.description}</p>
        <p className="text-sm text-slate-600">Logged for this request: {request.timeEntries.filter(entry => !entry.voidedAt).reduce((sum, entry) => sum + entry.minutes, 0)} minutes across all months.</p>
        {!!request.timeEntries.length && <ul className="space-y-2 text-sm" aria-label="Recorded work">{request.timeEntries.map(entry => <li key={entry.id} className="rounded-lg bg-slate-50 p-3"><p>{entry.month} · {entry.minutes} minutes · {entry.actor.name ?? "Developer"}{entry.voidedAt ? " · VOIDED" : ""}</p><p className="whitespace-pre-wrap break-words">{entry.description}</p>{entry.voidReason && <p>Correction: {entry.voidReason}</p>}</li>)}</ul>}
        <details><summary className="cursor-pointer text-sm font-semibold text-indigo-700">Progress and history</summary><ol className="mt-3 space-y-3 text-sm">{request.events.map(event => <li key={event.version} className="border-l-2 border-slate-200 pl-3"><p>{event.action.replaceAll("_", " ")} · {event.actor.name ?? "Team member"} · <time dateTime={event.createdAt.toISOString()}>{event.createdAt.toISOString()}</time></p>{event.note && <p className="whitespace-pre-wrap break-words text-slate-600">{event.note}</p>}</li>)}</ol></details>
        {request.status === "COMPLETED" && <Link className="text-sm font-semibold text-indigo-700 underline" href={`/sites/${encodeURIComponent(business.id)}`}>View published website</Link>}
        {business.isOwner && request.status === "IN_PROGRESS" && <p className="text-sm text-slate-600">To change or cancel work in progress, discuss it with your developer.</p>}
        <ManagedRequestControls key={`${request.id}:${request.version}:${business.eligible}`} businessId={business.id} requestId={request.id} version={request.version} status={request.status} developer={business.isDeveloper} owner={business.isOwner} eligible={business.eligible} entries={request.timeEntries.map(entry => ({ id: entry.id, minutes: entry.minutes, month: entry.month, voided: !!entry.voidedAt }))} />
      </article>)}
    </section>
  </main>;
}
