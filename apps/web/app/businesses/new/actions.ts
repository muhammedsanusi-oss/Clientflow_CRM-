"use server";
import { currentUserId } from "../../../../../packages/auth/src/index";
import { ProvisionBusiness, provisionBusiness, regenerateOwnerPassword, apiError, type ProvisionBusinessInput } from "../../../../../packages/domain/src/index";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
export type BusinessActionState = {
  values?: Record<keyof ProvisionBusinessInput, string>;
  fieldErrors?: Partial<Record<keyof ProvisionBusinessInput, string[]>>;
  error?: { code: string; message: string };
  receipt?: { businessId: string; businessName: string; ownerEmail: string; temporaryPassword: string; expiresAt: string; websiteUrl?: string };
};
export async function addBusinessAction(_state: BusinessActionState, form: FormData): Promise<BusinessActionState> {
  const userId = await currentUserId(); if (!userId) redirect("/login");
  const read = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)) : "";
  const values = { name: read("name"), business_type: read("business_type"), email: read("email"), phone_number: read("phone_number"), first_name: read("first_name"), last_name: read("last_name"), owner_email: read("owner_email"), description: read("description"), website_template: read("website_template") || "CONTACT", public_address: read("public_address"), opening_hours: read("opening_hours") };
  const parsed = ProvisionBusiness.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: parsed.error.flatten().fieldErrors, error: { code: "VALIDATION", message: "Review the highlighted fields." } };
  try {
    const result = await provisionBusiness(userId, parsed.data);
    revalidatePath("/");
    return { receipt: { businessId: result.business.id, businessName: result.business.name, ownerEmail: result.ownerEmail, temporaryPassword: result.temporaryPassword, expiresAt: result.expiresAt, websiteUrl: result.business.websiteTemplate ? `/sites/${result.business.id}` : undefined } };
  } catch (error) { const mapped = apiError(error); return { values, error: { code: mapped.code, message: mapped.message } }; }
}
export async function regeneratePasswordAction(_state: BusinessActionState, form: FormData): Promise<BusinessActionState> {
  const userId = await currentUserId(); if (!userId) redirect("/login");
  try {
    const result = await regenerateOwnerPassword(userId, String(form.get("businessId") ?? ""));
    revalidatePath("/");
    return { receipt: { businessId: result.business.id, businessName: result.business.name, ownerEmail: result.ownerEmail, temporaryPassword: result.temporaryPassword, expiresAt: result.expiresAt, websiteUrl: result.business.websiteTemplate ? `/sites/${result.business.id}` : undefined } };
  } catch (error) { const mapped = apiError(error); return { error: { code: mapped.code, message: mapped.message } }; }
}
