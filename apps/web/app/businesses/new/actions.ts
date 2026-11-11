/*
 * Code guide: apps/web/app/businesses/new/actions.ts
 * Authenticates the developer, parses the business/owner/template form, calls transactional provisioning,
 * refreshes the dashboard, and returns the one-time receipt or safe form errors.
 * Exported actions run on the server; browser forms cannot call the database directly.
 */
"use server";
/*
 * Import connection: ../../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "../../../../../packages/auth/src/index";
/*
 * Import connection: ../../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * ProvisionBusiness: Shared business/owner/website validator used before transactional provisioning. Defined
 * in packages/domain/src/provisioning.ts.
 * provisionBusiness: Creates business, owner login, owner membership, website selection, and developer grants
 * in one transaction. Returns a generated temporary credential for the one-time handoff. Defined in
 * packages/domain/src/provisioning.ts.
 * regenerateOwnerPassword: Replaces an unconsumed pending-owner credential and revokes its tickets after
 * rechecking developer access. Refuses an active owner password reset. Defined in
 * packages/domain/src/provisioning.ts.
 * apiError: Maps deliberate domain failures and known database conflicts into a safe public
 * code/message/status. Unexpected exceptions become a generic error. Defined in
 * packages/domain/src/errors.ts.
 * Type ProvisionBusinessInput: Type contract used to check callers at compile time; it does not fetch or
 * modify data. Defined in packages/domain/src/provisioning.ts.
 */
import { ProvisionBusiness, provisionBusiness, regenerateOwnerPassword, apiError, type ProvisionBusinessInput } from "../../../../../packages/domain/src/index";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { redirect } from "next/navigation";
/*
 * Import connection: next/cache.
 * Next.js cache revalidation. revalidatePath refreshes affected route data after a successful write; it does
 * not write database rows.
 * revalidatePath: Invalidates cached route output after a successful write so a subsequent visit reads
 * current data.
 */
import { revalidatePath } from "next/cache";
// Type contract: BusinessActionState. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
export type BusinessActionState = {
  values?: Record<keyof ProvisionBusinessInput, string>;
  fieldErrors?: Partial<Record<keyof ProvisionBusinessInput, string[]>>;
  error?: { code: string; message: string };
  receipt?: { businessId: string; businessName: string; ownerEmail: string; temporaryPassword: string; setupPath?: string; expiresAt: string; websiteUrl?: string };
};
/*
 * Authenticates the developer, parses the business/owner/template form, calls transactional provisioning,
 * refreshes the dashboard, and returns the one-time receipt or safe form errors.
 */
export async function addBusinessAction(_state: BusinessActionState, form: FormData): Promise<BusinessActionState> {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId(); if (!userId) redirect("/login");
  const read = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)) : "";
  const values = { name: read("name"), business_type: read("business_type"), email: read("email"), phone_number: read("phone_number"), first_name: read("first_name"), last_name: read("last_name"), owner_email: read("owner_email"), description: read("description"), website_template: read("website_template") || "CONTACT", public_address: read("public_address"), opening_hours: read("opening_hours") };
  const parsed = ProvisionBusiness.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: parsed.error.flatten().fieldErrors, error: { code: "VALIDATION", message: "Review the highlighted fields." } };
  try {
    const result = await provisionBusiness(userId, parsed.data, "link");
    revalidatePath("/");
    return { receipt: { businessId: result.business.id, businessName: result.business.name, ownerEmail: result.ownerEmail, temporaryPassword: result.temporaryPassword, setupPath: result.setupPath, expiresAt: result.expiresAt, websiteUrl: result.business.websiteTemplate ? `/sites/${result.business.id}` : undefined } };
  } catch (error) { const mapped = apiError(error); return { values, error: { code: mapped.code, message: mapped.message } }; }
}
/*
 * Authenticates the developer and delegates pending-password regeneration to the protected domain function,
 * returning its new one-time receipt.
 */
export async function regeneratePasswordAction(_state: BusinessActionState, form: FormData): Promise<BusinessActionState> {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId(); if (!userId) redirect("/login");
  try {
    const result = await regenerateOwnerPassword(userId, String(form.get("businessId") ?? ""), "link");
    revalidatePath("/");
    return { receipt: { businessId: result.business.id, businessName: result.business.name, ownerEmail: result.ownerEmail, temporaryPassword: result.temporaryPassword, setupPath: result.setupPath, expiresAt: result.expiresAt, websiteUrl: result.business.websiteTemplate ? `/sites/${result.business.id}` : undefined } };
  } catch (error) { const mapped = apiError(error); return { error: { code: mapped.code, message: mapped.message } }; }
}
