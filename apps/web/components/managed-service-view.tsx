import Link from "./app-link";
import type { getManagedService } from "../../../packages/domain/src/managed-service";
import { ManagedRequestControls, ManagedRequestForm } from "./managed-service-controls";
import "./managed-service.css";

export function ManagedServiceView({ data }: { data: Awaited<ReturnType<typeof getManagedService>> }) {
  const { business } = data;
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${data.month}-01T00:00:00Z`));
  const resetLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(data.resetsAt);
  return <main className="managed-studio">
    <header className="ms-intro"><span className="ms-eyebrow">A LITTLE EXTRA CARE</span><p className="ms-business"><span aria-hidden="true">✦</span> {business.name}</p><h1>Managed content changes</h1><p>Fresh details. Thoughtful updates. A website that keeps up with you.</p><p className="ms-subtitle">Small updates to your existing website, handled by your developer.</p></header>
    <section className="ms-allowance" aria-label="Monthly service allowance">
      <div className="ms-allowance-top"><div><span className="ms-eyebrow">YOUR MONTHLY WEBSITE CARE</span><h2>{monthLabel}</h2><p>{data.month} · UTC monthly allowance</p></div><span className={`ms-plan-pill ${business.eligible ? "ms-plan-active" : ""}`}><span aria-hidden="true" />{business.eligible ? "Managed plan active" : "Managed plan required"}</span></div>
      <div className="ms-allowance-body"><div className="ms-minutes"><span className="ms-minute-number">{data.remaining}<span> / 30</span></span><h3>{data.remaining} of 30 minutes available</h3><p>For the little changes that make a big difference.</p><progress aria-label="Available monthly service minutes" value={Math.max(0, Math.min(30, data.remaining))} max={30} /></div>
        <div className="ms-metrics"><div><span className="ms-metric-icon" aria-hidden="true">◷</span><div><span>Time recorded</span><strong>{data.used} minutes</strong><small>This month</small></div></div><div><span className="ms-metric-icon" aria-hidden="true">↻</span><div><span>Next refresh</span><strong><time dateTime={data.resetsAt.toISOString()}>{resetLabel}</time></strong><small>00:00 UTC · No rollover</small></div></div></div>
      </div>
      {!business.eligible && <p className="ms-notice">An active Managed subscription is required to request or perform further included work. Your history remains available.</p>}
      {business.eligible && data.remaining === 0 && <p className="ms-notice">This month’s included time is used. You can submit requests for the next eligible month. Additional work requires a separate quote.</p>}
      <div className="ms-allowance-footer"><p>Platform bug fixes and your own website edits never consume these minutes.</p><Link href={`/subscription?businessId=${encodeURIComponent(business.id)}`}>Manage demo subscription <span aria-hidden="true">↗</span></Link></div>
    </section>
    <p className="ms-demo-note">Demo workflow: no real charges. New features, redesigns, and extra work require a separate quote. Resets {data.resetsAt.toISOString().slice(0, 10)} at 00:00 UTC; unused minutes do not roll over.</p>
    {business.isOwner && business.eligible && <ManagedRequestForm businessId={business.id} />}
    {business.isDeveloper && <p className="ms-developer-guide"><span aria-hidden="true">✧</span> Make and publish the requested changes in the <Link href={`/businesses/${encodeURIComponent(business.id)}/website`}>website editor</Link>, then record the content-change time and completion note here. Status updates do not publish content.</p>}
    <section className="ms-requests space-y-4"><div className="ms-section-heading"><div><span className="ms-eyebrow">FROM IDEA TO ALL DONE</span><h2>Content requests</h2></div><span className="ms-count">{data.requests.length} {data.requests.length === 1 ? "request" : "requests"}</span></div>
      {!data.requests.length && <div className="ms-empty"><svg viewBox="0 0 120 100" aria-hidden="true"><rect x="30" y="10" width="62" height="78" rx="11" fill="currentColor" opacity=".09" transform="rotate(9 60 50)"/><rect x="20" y="12" width="62" height="78" rx="11" fill="var(--ws-surface,#fff)" stroke="currentColor" strokeWidth="1.5" opacity=".8"/><path d="M35 35h31M35 46h31M35 57h18m40-42v18m-9-9h18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="m61 73 7-7 6 6 14-16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg><h3>A fresh little update starts here</h3><p>No content-change requests yet.</p><p>Text, hours, prices, or a favorite new photo — keep your website feeling like you.</p></div>}
      {data.requests.map(request => <article key={request.id} data-status={request.status} className="ms-request min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
