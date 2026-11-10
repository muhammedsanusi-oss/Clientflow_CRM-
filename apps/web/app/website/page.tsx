/*
 * Code guide: apps/web/app/website/page.tsx
 * /website page for an active owner. Shows the published site, editor entry, publication time, and authorized
 * website switch links.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: ../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "../../../../packages/auth/src/index";
/*
 * Import connection: ../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * getOwnerWebsite: Reads one configured website only through the current user active OWNER membership,
 * including the publication time needed by the private owner view. Defined in
 * packages/domain/src/websites.ts.
 * listOwnerWebsites: Returns only configured businesses for which the current user has an active OWNER
 * membership; used for the owner website switch links. Defined in packages/domain/src/websites.ts.
 */
import { getOwnerWebsite, listOwnerWebsites } from "../../../../packages/domain/src/index";
/*
 * Import connection: ../../../../packages/domain/src/errors -> packages/domain/src/errors.ts.
 * DomainError: Deliberate safe domain failure carrying an allowed public code/message.
 */
import { DomainError } from "../../../../packages/domain/src/errors";
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
 * Import connection: ../../components/business-sites/business-website ->
 * apps/web/components/business-sites/business-website.tsx.
 * BusinessWebsite: Shared rendering for live sites, creation previews, editor previews, and owner previews.
 * Combines public business fields with saved content or template defaults and includes ContactForm.
 */
import { BusinessWebsite } from "../../components/business-sites/business-website";
import { OwnerWorkspace } from "../../components/owner-workspace";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

/*
 * /website page for an active owner. Shows the published site, editor entry, publication time, and authorized
 * website switch links.
 */
export default async function OwnerWebsitePage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { businessId } = await searchParams;
  if (businessId !== undefined && typeof businessId !== "string") notFound();
  const site = await getOwnerWebsite(userId, businessId).catch(error => {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  // The selector contains only websites for which this user is an active owner.
  const selectable = (await listOwnerWebsites(userId)).filter(business => business.id !== site.id);
  return <OwnerWorkspace business={site} active="preview">
    <main className="mx-auto max-w-7xl space-y-6 px-5 py-12">
    <Link href={`/customers?businessId=${encodeURIComponent(site.id)}`} className="text-sm text-indigo-700 underline">Back to business portal</Link>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm text-slate-500">{site.name}</p><h1 className="mt-2 text-3xl font-semibold">Your website</h1>
        <p className="mt-2 text-sm text-slate-600">{site.websiteContent ? `Last published ${site.websiteContent.publishedAt.toISOString()}` : "Your website uses its original template content."}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href={`/businesses/${site.id}/website`} className="rounded-xl border border-indigo-700 px-5 py-3 text-sm font-semibold text-indigo-700">Edit website</Link>
        <a href={`/sites/${site.id}`} target="_blank" rel="noreferrer" className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white">Open website</a>
      </div>
    </header>
    {selectable.length > 0 && <nav aria-label="Your business websites" className="flex flex-wrap gap-4"><span className="text-sm font-semibold">Switch website:</span>{selectable.map(business => <Link key={business.id} href={`/website?businessId=${encodeURIComponent(business.id)}`} className="text-sm text-indigo-700 underline">{business.name}</Link>)}</nav>}
    <aside className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5"><h2 className="font-semibold text-indigo-950">Customize your website</h2><p className="mt-2 text-sm text-indigo-900">Use Edit website to update your public details, text, visual style, sections, and images. Contact the Clientflow team for changes beyond the available controls.</p></aside>
    <section aria-label="Published website preview" className="overflow-hidden rounded-2xl border border-slate-200"><BusinessWebsite preview site={{ ...site, websiteTemplate: site.websiteTemplate! }} /></section>
    </main>
  </OwnerWorkspace>;
}
