/*
 * Code guide: apps/web/app/businesses/[id]/website/page.tsx
 * Owner/developer website editor entry. Resolves the business through an active owner membership or explicit
 * developer grant and supplies saved public fields and version to WebsiteEditor.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: ../../../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "../../../../../../packages/auth/src/index";
/*
 * Import connection: ../../../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * getWebsiteEditor: Returns authorized saved public fields, content defaults for older sites, the user's editor
 * capabilities, and the current publication version. Reading the editor does not publish a change. Defined in
 * packages/domain/src/websites.ts.
 */
import { getWebsiteEditor } from "../../../../../../packages/domain/src/index";
/*
 * Import connection: ../../../../../../packages/domain/src/errors -> packages/domain/src/errors.ts.
 * DomainError: Deliberate safe domain failure carrying an allowed public code/message.
 */
import { DomainError } from "../../../../../../packages/domain/src/errors";
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
 * Import connection: ./website-editor -> apps/web/app/businesses/[id]/website/website-editor.tsx.
 * WebsiteEditor: Live page preview with click-to-edit website sections and image galleries.
 * Template controls are available only to developers. Edits stay local until the protected publish action.
 */
import { WebsiteEditor } from "./website-editor";
import { OwnerWorkspace } from "../../../../components/owner-workspace";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

/*
 * Owner/developer website editor entry. Resolves the business through the current user's authorized
 * membership or developer grant and supplies saved public fields and version to WebsiteEditor.
 */
export default async function WebsiteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { id } = await params;
  const site = await getWebsiteEditor(userId, id).catch(error => {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const {
    id: businessId,
    canChangeTemplate,
    maxImages,
    imageCount,
    canAddCustomSections,
    canSubmitFeatureRequests,
    featureRequestCount,
    featureRequestLimit,
    websitePlan,
    ...initial
  } = site;
  const page = <main className="mx-auto max-w-7xl space-y-6 px-5 py-12">
    <Link href={canChangeTemplate ? `/businesses/${businessId}` : `/customers?businessId=${encodeURIComponent(businessId)}`} className="text-sm text-indigo-700 underline">{canChangeTemplate ? "Back to business details" : "Back to business portal"}</Link>
    <header><p className="text-sm text-slate-500">{site.name}</p><h1 className="mt-2 text-3xl font-semibold">Edit website</h1><p className="mt-3 text-sm text-slate-600">See the website as you edit it. Click a section to change its text or add images, then publish when it looks right.</p></header>
    <WebsiteEditor
      businessId={businessId}
      initial={initial}
      canChangeTemplate={canChangeTemplate}
      maxImages={maxImages}
      imageCount={imageCount}
      canAddCustomSections={canAddCustomSections}
      canSubmitFeatureRequests={canSubmitFeatureRequests}
      featureRequestCount={featureRequestCount}
      featureRequestLimit={featureRequestLimit}
      websitePlan={websitePlan}
    />
  </main>;
  return canChangeTemplate
    ? page
    : <OwnerWorkspace business={site} active="edit">{page}</OwnerWorkspace>;
}
