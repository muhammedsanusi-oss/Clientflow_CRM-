/*
 * Code guide: apps/web/app/businesses/[id]/page.tsx
 * Developer business detail page. Shows public business information and owner activation status; configured
 * sites have Edit website and Open website actions. Pending credentials can be regenerated.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: ../../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "../../../../../packages/auth/src/index";
/*
 * Import connection: ../../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * getProvisionedBusiness: Loads one business only when this developer has its explicit grant. Missing and
 * foreign IDs produce the same not-found domain error. Defined in packages/domain/src/provisioning.ts.
 */
import { getProvisionedBusiness } from "../../../../../packages/domain/src/index";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { notFound, redirect } from "next/navigation";
/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "next/link";
/*
 * Import connection: ./regenerate-password -> apps/web/app/businesses/[id]/regenerate-password.tsx.
 * RegeneratePassword: Developer control that requests replacement credentials only for a pending owner
 * account. The server action rechecks developer access and refuses resets of active owners.
 */
import { RegeneratePassword } from "./regenerate-password";
/*
 * Developer business detail page. Shows public business information and owner activation status; configured
 * sites have Edit website and Open website actions. Pending credentials can be regenerated.
 */
export default async function BusinessSetupPage({ params }: { params: Promise<{ id: string }> }) {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId(); if (!userId) redirect("/login");
  const { id } = await params;
  const business = await getProvisionedBusiness(userId, id).catch(() => null);
  if (!business) notFound();
  const owner = business.employees[0];
  return <main className="mx-auto max-w-2xl space-y-6 px-5 py-12">
    <Link href="/" className="text-indigo-700 underline">Back to dashboard</Link>
    <h1 className="text-3xl font-semibold">{business.name}</h1>
    <p className="text-slate-600">{business.description}</p>
    {business.websiteTemplate && <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{business.websiteTemplate} template</span><Link href={`/businesses/${business.id}/website`} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Edit website</Link><Link href={`/sites/${business.id}`} target="_blank" rel="noreferrer" className="text-sm text-indigo-700 underline">Open website</Link></div>}
    <dl className="space-y-3 rounded-2xl border border-slate-200 p-6 text-sm">
      <div><dt className="font-semibold">Business email</dt><dd>{business.email}</dd></div>
      <div><dt className="font-semibold">Business phone</dt><dd>{business.phone_number}</dd></div>
      <div><dt className="font-semibold">Owner login email</dt><dd>{owner?.email}</dd></div>
      <div><dt className="font-semibold">Owner access</dt><dd>{!owner?.user.mustChangePassword ? "Active" : owner.user.temporaryExpiresAt && owner.user.temporaryExpiresAt <= new Date() ? "Temporary password expired" : "Pending password setup"}</dd></div>
    </dl>
    {owner?.user.mustChangePassword && <RegeneratePassword businessId={business.id} />}
  </main>;
}
