import { currentUserId } from "@project/auth";
import { getUser, listOwnerDashboardBusinesses } from "@project/domain";
import { notFound, redirect } from "next/navigation";
import Link from "../../components/app-link";
import { DEMO_PLANS, hasCrmAccess, hasWebsiteAccess, ownerWorkspaceHref } from "../../../../packages/domain/src/subscription-access";
import { OwnerWorkspace } from "../../components/owner-workspace";
import "./owner-dashboard.css";

export const dynamic = "force-dynamic";

function DashboardIcon({ kind }: { kind: "website" | "customers" | "scheduling" | "account" }) {
  const paths = {
    website: "M4 4h16v16H4z M4 9h16 M7 6.5h.01 M10 6.5h.01 M8 13h8 M8 16h5",
    customers: "M16 20v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M17 5a3 3 0 0 1 0 6 M20 20v-2a4 4 0 0 0-3-3.87",
    scheduling: "M5 5h14v15H5z M8 3v4 M16 3v4 M5 10h14 M8 14h2 M14 14h2 M8 17h2",
    account: "M4 6h16 M4 12h16 M4 18h16 M8 4v4 M16 10v4 M10 16v4",
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]} /></svg>;
}

function Tool({ href, title, description }: { href: string; title: string; description: string }) {
  return <Link className="od-tool" href={href}><div><h3>{title}</h3><p>{description}</p></div><span aria-hidden="true">→</span></Link>;
}

export default async function OwnerDashboardPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const user = await getUser(userId);
  if (!user) redirect("/login");
  if (user.isDeveloper) redirect("/");

  const { businessId } = await searchParams;
  if (businessId !== undefined && (typeof businessId !== "string" || !businessId)) notFound();
  const businesses = await listOwnerDashboardBusinesses(userId);
  const business = businessId === undefined ? businesses[0] : businesses.find(item => item.id === businessId);
  if (businessId !== undefined && !business) notFound();
  if (!business) return <main className="od-empty"><h1>Your business dashboard</h1><p>No business workspace is linked to your account. Contact your Clientflow developer to get access.</p></main>;
  const query = `?businessId=${encodeURIComponent(business.id)}`;
  const subscription = business.demoSubscription;
  const websiteAccess = hasWebsiteAccess(subscription), crmAccess = hasCrmAccess(subscription);
  const status = !subscription ? "Legacy access" : subscription.status === "ACTIVE" ? websiteAccess ? "Active" : "Expired"
    : ({ PENDING: "Pending activation", CANCELED: "Canceled", PAST_DUE: "Payment overdue" }[subscription.status] ?? "Unavailable");
  return <OwnerWorkspace business={business} active="home"><main className="owner-dashboard">
    <header className="od-intro"><div><p className="od-eyebrow">Your business, in one place</p><h1>Business dashboard</h1><p>Manage your website, care for your customers, and find your next step.</p></div><span className={`od-status ${websiteAccess ? "od-status-active" : ""}`}>{status}</span></header>
    {businesses.length > 1 && <nav aria-label="Choose your business" className="od-switcher">{businesses.map(item => <Link key={item.id} href={ownerWorkspaceHref(item)} aria-current={item.id === business.id ? "page" : undefined}>{item.name}</Link>)}</nav>}
    {!websiteAccess && <aside className="od-notice"><div><h2>Your dashboard is still available</h2><p>Your demo subscription is {status.toLowerCase()}. Website editing and CRM tools need an active plan. Your published website and saved data remain in place.</p></div><Link href={`/subscription${query}`} className="od-button">Manage subscription <span aria-hidden="true">→</span></Link></aside>}
    <div className="od-grid">
      <section className="od-group" aria-labelledby="od-website"><div className="od-group-heading"><span className="od-icon" aria-hidden="true">▤</span><div><h2 id="od-website">Website</h2><p>Your online presence</p></div></div>
        {business.websiteTemplate ? <>{websiteAccess && <Tool href={`/businesses/${encodeURIComponent(business.id)}/website`} title="Edit website" description="Update text, colors, photos, and sections." />}<Tool href={`/website${query}`} title="Website preview" description="Review your published website and open it online." />{websiteAccess && <Tool href={`/inquiries${query}`} title="Website inquiries" description="Read messages sent through your contact form." />}{!websiteAccess && <p className="od-locked">Editing and inquiries become available with an active website plan.</p>}</> : <p className="od-locked">Your website is not configured yet. Contact your developer to complete the setup.</p>}
      </section>
      <section className="od-group" aria-labelledby="od-customers"><div className="od-group-heading"><span className="od-icon" aria-hidden="true">♧</span><div><h2 id="od-customers">Customers</h2><p>Relationships and shared context</p></div></div>
        {crmAccess ? <><Tool href={`/customers${query}`} title="Customer directory" description="Find, add, and update customer details." /><Tool href={`/notes${query}`} title="Customer notes" description="Review conversations and shared notes." /></> : <p className="od-locked">Customer tools require an active Website + standard CRM or Managed service plan.</p>}
      </section>
      <section className="od-group" aria-labelledby="od-scheduling"><div className="od-group-heading"><span className="od-icon" aria-hidden="true">▦</span><div><h2 id="od-scheduling">Scheduling</h2><p>Appointments and availability</p></div></div>
        {crmAccess ? <><Tool href={`/calendar${query}`} title="Appointment calendar" description="See appointments and choose a customer to schedule." /><Tool href={`/calendar/services${query}`} title="Bookable services" description="Manage the services customers can book." /><Tool href={`/calendar/hours${query}`} title="Business hours & staff" description="Set opening hours and staff availability." /></> : <p className="od-locked">Scheduling requires an active Website + standard CRM or Managed service plan.</p>}
      </section>
      <section className="od-group" aria-labelledby="od-account"><div className="od-group-heading"><span className="od-icon" aria-hidden="true">≡</span><div><h2 id="od-account">Account & support</h2><p>{subscription ? DEMO_PLANS[subscription.plan].label : "Existing workspace access"}</p></div></div>
        <Tool href={`/subscription${query}`} title="Demo subscription" description="Review your plan, access, and simulated payment history." />{subscription?.plan === "MANAGED" && websiteAccess ? <Tool href={`/managed-service${query}`} title="Managed content changes" description="Ask your developer for updates and follow progress." /> : <p className="od-locked">Managed content requests are included with an active Managed service plan.</p>}<p className="od-footnote">Demo billing only. No real charges.</p>
      </section>
    </div>
  </main></OwnerWorkspace>;
}
