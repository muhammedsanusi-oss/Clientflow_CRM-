/*
 * Code guide: apps/web/app/businesses/[id]/website/actions.ts
 * Server Action called by WebsiteEditor. Validates the publication payload, delegates the transactional
 * write, and revalidates affected developer, owner, and public routes.
 * Exported actions run on the server; browser forms cannot call the database directly.
 */
"use server";

/*
 * Import connection: ../../../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "../../../../../../packages/auth/src/index";
/*
 * Import connection: ../../../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * PublishWebsite: Strict shared publication schema for editable fields, text limits, array limits, and
 * version checks. Defined in packages/domain/src/website-editing.ts.
 * publishWebsite: Rechecks developer access and the submitted version, then atomically writes business
 * fields, content, and before/after revision snapshots. A stale version returns CONFLICT. Defined in
 * packages/domain/src/websites.ts.
 * apiError: Maps deliberate domain failures and known database conflicts into a safe public
 * code/message/status. Unexpected exceptions become a generic error. Defined in
 * packages/domain/src/errors.ts.
 */
import {
  PublishWebsite,
  WebsiteFeatureRequest,
  publishWebsite,
  submitWebsiteFeatureRequest,
  apiError,
} from "../../../../../../packages/domain/src/index";
/*
 * Import connection: next/cache.
 * Next.js cache revalidation. revalidatePath refreshes affected route data after a successful write; it does
 * not write database rows.
 * revalidatePath: Invalidates cached route output after a successful write so a subsequent visit reads
 * current data.
 */
import { revalidatePath } from "next/cache";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { redirect } from "next/navigation";

/*
 * Server Action called by WebsiteEditor. Validates the publication payload, delegates the transactional
 * write, and revalidates affected developer, owner, and public routes.
 */
export async function publishWebsiteAction(businessId: string, input: unknown) {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const parsed = PublishWebsite.safeParse(input);
  if (!parsed.success) return { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Check your website content." } };
  try {
    const result = await publishWebsite(userId, businessId, parsed.data);
    for (const path of ["/", `/businesses/${businessId}`, `/businesses/${businessId}/website`, `/sites/${businessId}`, "/website", "/customers", "/inquiries"]) revalidatePath(path);
    return { publication: result };
  } catch (error) {
    const mapped = apiError(error);
    return { error: { code: mapped.code, message: mapped.message } };
  }
}

export async function submitWebsiteFeatureRequestAction(businessId: string, input: unknown) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const parsed = WebsiteFeatureRequest.safeParse(input);
  if (!parsed.success) return { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Check your feature request." } };
  try {
    const result = await submitWebsiteFeatureRequest(userId, businessId, parsed.data);
    revalidatePath(`/businesses/${businessId}/website`);
    return { result };
  } catch (error) {
    const mapped = apiError(error);
    return { error: { code: mapped.code, message: mapped.message } };
  }
}
