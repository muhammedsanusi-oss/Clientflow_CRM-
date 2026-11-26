import Link from "./app-link";

type SetupBusiness = {
  id: string; websiteTemplate: string | null;
  locations: { is_active: boolean }[];
  services: { is_Active: boolean }[];
  hoursIntervals: unknown[];
};
export function BookingSetup({ business }: { business: SetupBusiness }) {
  const query = `?businessId=${encodeURIComponent(business.id)}`;
  const steps = [
    { label: "Location", ready: business.locations.some(item => item.is_active), href: `/calendar/locations${query}` },
    { label: "Bookable service", ready: business.services.some(item => item.is_Active), href: `/calendar/services${query}` },
    { label: "Opening hours", ready: business.hoursIntervals.length > 0, href: `/calendar/hours${query}` },
  ];
  const ready = !!business.websiteTemplate && steps.every(step => step.ready);
  return <section aria-label="Booking setup" className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="font-semibold">{ready ? "Online booking is configured" : "Finish your booking setup"}</h2>
    <p className="text-sm text-slate-600">{ready ? "Visitors can choose an available time on your public booking page." : "Complete each step before inviting customers to book."}</p>
    <ul className="flex flex-wrap gap-3">{steps.map(step => <li key={step.label}><Link href={step.href} className="text-sm text-indigo-700 underline">{step.label}: {step.ready ? "configured" : "add now"}</Link></li>)}</ul>
    {!business.websiteTemplate && <p className="text-sm text-slate-600">Ask your developer to configure your website before sharing online booking.</p>}
    {ready && <a href={`/book/${encodeURIComponent(business.id)}`} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-indigo-700 underline">Open public booking</a>}
  </section>;
}
