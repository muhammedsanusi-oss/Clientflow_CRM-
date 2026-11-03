"use server";

import { currentUserId } from "../../../../../packages/auth/src/index";
import { CreateBusiness, createBusiness, type CreateBusinessInput } from "../../../../../packages/domain/src/index";
import { log } from "../../../../../packages/log/src/index";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BusinessActionState = {
  values?: Record<keyof CreateBusinessInput, string>;
  fieldErrors?: Partial<Record<keyof CreateBusinessInput, string[]>>;
  error?: { code: "VALIDATION_ERROR" | "INTERNAL_ERROR"; message: string };
};

export async function addBusinessAction(_state: BusinessActionState, form: FormData): Promise<BusinessActionState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const read = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)) : "";
  const values = {
    name: read("name"), business_type: read("business_type"),
    email: read("email"), phone_number: read("phone_number"),
    first_name: read("first_name"), last_name: read("last_name"),
  };
  const parsed = CreateBusiness.safeParse(values);
  if (!parsed.success) return {
    values, fieldErrors: parsed.error.flatten().fieldErrors,
    error: { code: "VALIDATION_ERROR", message: "Review the highlighted fields." },
  };
  let businessId: string;
  try {
    const result = await createBusiness(userId, parsed.data);
    businessId = result.business.id;
  } catch (error) {
    log.error({ err: error, userId }, "business creation failed");
    return { values, error: { code: "INTERNAL_ERROR", message: "The business could not be created. Try again." } };
  }
  revalidatePath("/");
  revalidatePath("/customers");
  redirect(`/customers?businessId=${encodeURIComponent(businessId)}`);
}
