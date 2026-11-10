import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentUserId } from "../../../../packages/auth/src/index";
import { getDemoSubscription, listSubscriptionBusinesses } from "../../../../packages/domain/src/demo-subscriptions";
import { DEMO_PLANS, hasWebsiteAccess, ownerWorkspaceHref } from "../../../../packages/domain/src/subscription-access";
import { DemoControls } from "./demo-controls";
import { getUser } from "../../../../packages/domain/src/queries/users";
import { getManagedService } from "../../../../packages/domain/src/managed-service";

export const dynamic = "force-dynamic";
function historySummary(value: unknown) {
  if (!value || typeof value !== "object") return "No subscription";
  const item = value as Record<string, unknown>;
  if (item.subscription === null) return "No demo subscription";
  if (item.legacy) return "Legacy demo access";
  const plan = typeof item.plan === "string" && item.plan in DEMO_PLANS
    ? DEMO_PLANS[item.plan as keyof typeof DEMO_PLANS].label : "Demo service";
  return `${plan} · $${Number(item.amountCents) / 100} USD · ${String(item.status).replaceAll("_", " ")}${item.periodStart ? ` · period starts ${String(item.periodStart)}` : ""}${item.periodEnd ? ` · paid through ${String(item.periodEnd)}` : ""}`;
}
export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ businessId?: string }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const businesses = await listSubscriptionBusinesses(userId);
  const user = await getUser(userId);
  const { businessId } = await searchParams;
  const selectedId = businessId ?? businesses[0]?.id;
  const business = selectedId ? await getDemoSubscription(userId, selectedId) : null;
  if (selectedId && !business) notFound();
  const subscription = business?.demoSubscription;
  const active = hasWebsiteAccess(subscription);
  const managed = business ? await getManagedService(userId, business.id) : null;
  return <main className="mx-auto max-w-4xl space-y-6 px-5 py-16">
    <h1 className="text-3xl font-bold text-[#172b4d]">Demo subscription</h1>
    <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-900">Demo: no real charges. No payment details are collected. Hosting, maintenance, and support are proposed services; this demo does not deploy hosting or provide staffed support.</p>
    <nav aria-label="Business subscriptions" className="flex flex-wrap gap-3">
      {businesses.map(item => <Link key={item.id} href={`/subscription?businessId=${encodeURIComponent(item.id)}`} aria-current={item.id === selectedId ? "page" : undefined} className="rounded-lg border border-slate-300 px-3 py-2">{item.name}</Link>)}
    </nav>
    {!business ? <p>No business subscription is linked to your account.</p> : <>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">{business.name}</h2>
        <p>{subscription ? `${DEMO_PLANS[subscription.plan].label} — $${DEMO_PLANS[subscription.plan].cents / 100}/month USD` : "Legacy demo access — no subscription or automatic charges"}</p>
        <p>Status: {subscription ? (subscription.status === "ACTIVE" && !active ? "EXPIRED" : subscription.status) : "Legacy demo access"}</p>
        {subscription?.periodEnd && <p>Paid through (simulated): <time dateTime={subscription.periodEnd.toISOString()}>{subscription.periodEnd.toISOString()}</time></p>}
        {user?.isDeveloper && business.websiteTemplate
          ? <Link href={`/businesses/${encodeURIComponent(business.id)}/website`} className="inline-flex rounded-xl border border-indigo-300 px-4 py-2 font-semibold text-indigo-700">Open website editor</Link>
          : active && <Link href={ownerWorkspaceHref(business)} className="inline-flex rounded-xl border border-indigo-300 px-4 py-2 font-semibold text-indigo-700">Open owner workspace</Link>}
        <DemoControls key={`${business.id}:${subscription?.version ?? -1}`} businessId={business.id} version={subscription?.version ?? -1} currentPlan={subscription?.plan ?? "STANDARD"} />
        {managed && (subscription?.plan === "MANAGED" || managed.requests.length > 0) && <aside className="space-y-2 rounded-xl bg-indigo-50 p-4">
          <h3 className="font-semibold">Managed content changes</h3>
          <p>{managed.remaining} of 30 minutes available · {managed.month} (UTC). {managed.used} minutes recorded this month.</p>
          <p className="text-sm">Small content updates by your developer. Your own edits and platform bug fixes do not use this allowance. Additional work requires a separate quote.</p>
          <Link href={managed.business.isDeveloper ? `/businesses/${encodeURIComponent(business.id)}/managed-service` : `/managed-service?businessId=${encodeURIComponent(business.id)}`} className="inline-flex rounded-lg border border-indigo-300 bg-white px-3 py-2 font-semibold text-indigo-700">{managed.business.eligible ? "Open managed service" : "View managed-service history"}</Link>
        </aside>}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Simulated event history</h2>
        <p className="text-sm text-slate-600">These events are demonstrations, not receipts or invoices.</p>
        {business.demoSubscriptionEvents.length === 0 && <p>No simulated billing events.</p>}
        <ol className="space-y-3">{business.demoSubscriptionEvents.map(event => <li key={event.version} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-semibold">{event.action.replaceAll("_", " ")} — version {event.version}</p>
          <p className="text-sm">{event.actor.name ?? event.actor.id} · {event.createdAt.toISOString()}</p>
          <p className="mt-2 break-words text-sm text-slate-600">Before: {historySummary(event.before)}</p>
          <p className="break-words text-sm text-slate-600">After: {historySummary(event.after)}</p>
        </li>)}</ol>
      </section>
    </>}
    <Link href="/owner" className="inline-flex rounded-xl border border-slate-300 px-4 py-2">Back to workspace</Link>
  </main>;
}
