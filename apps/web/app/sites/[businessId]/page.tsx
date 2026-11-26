/*
 * Code guide: apps/web/app/sites/[businessId]/page.tsx
 * Public /sites/[businessId] page. Loads only allowlisted website data and uses the shared renderer; missing
 * or unconfigured sites return 404.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: ../../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * getPublicWebsite: Returns only configured sites and explicitly allowlisted public business/content fields.
 * Owner credentials, CRM records, and revision authors are not part of this projection. Defined in
 * packages/domain/src/websites.ts.
 */
import { getPublicWebsite, isPublicBookingReady } from "../../../../../packages/domain/src/index";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 */
import { notFound } from "next/navigation";
/*
 * Import connection: ../../../components/business-sites/business-website ->
 * apps/web/components/business-sites/business-website.tsx.
 * BusinessWebsite: Shared rendering for live sites, creation previews, editor previews, and owner previews.
 * Combines public business fields with saved content or template defaults and includes ContactForm.
 */
import { BusinessWebsite } from "../../../components/business-sites/business-website";
// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";
/*
 * Public /sites/[businessId] page. Loads only allowlisted website data and uses the shared renderer; missing
 * or unconfigured sites return 404.
 */
export default async function PublicBusinessWebsite({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const site = await getPublicWebsite(businessId);
  if (!site?.websiteTemplate) notFound();
  const bookingAvailable = await isPublicBookingReady(businessId);
  return <>{site.websiteTemplate === "BAKERY" && <nav aria-label="Bakery shopping" style={{ padding: "16px 24px", background: "#235d46", color: "white", textAlign: "center", display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}><a style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }} href={`/sites/${encodeURIComponent(businessId)}/shop`}>Shop available products · Open cart</a><a style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }} href={`/sites/${encodeURIComponent(businessId)}/track`}>Order status</a></nav>}<BusinessWebsite site={{ ...site, websiteTemplate: site.websiteTemplate, bookingAvailable }} /></>;
}
