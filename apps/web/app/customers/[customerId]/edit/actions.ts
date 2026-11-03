"use server";

import { currentUserId } from "@project/auth";
import { apiError, createCustomerInputSchema, getCustomerWithNotesForUser, updateCustomerForUser } from "@project/domain";
import type { CustomerFormInput } from "@project/domain";
import { log } from "@project/log";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

export type EditCustomerState = {
  values?: Record<keyof CustomerFormInput, string>;
  fieldErrors?: Partial<Record<keyof CustomerFormInput, string[]>>;
  error?: { code: string; message: string };
};

export async function editCustomerAction(_previous: EditCustomerState, form: FormData): Promise<EditCustomerState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const submittedId = form.get("customerId");
  const customerId = typeof submittedId === "string" ? submittedId : "";
  const fields = ["firstName", "lastName", "phoneNumber", "email", "address", "preferredContactMethod"] as const;
  const values = Object.fromEntries(fields.map((field) => {
    const value = form.get(field);
    return [field, typeof value === "string" ? value : ""];
  })) as Record<keyof CustomerFormInput, string>;
  const parsed = createCustomerInputSchema.safeParse(values);
  let updated = false;
  try {
    const customer = await getCustomerWithNotesForUser(userId, customerId);
    if (!customer) {
      updated = false;
    } else if (!parsed.success) {
      return { values, fieldErrors: parsed.error.flatten().fieldErrors, error: { code: "VALIDATION_ERROR", message: "Review the highlighted fields." } };
    } else {
      updated = await updateCustomerForUser(userId, customerId, parsed.data);
    }
  } catch (error) {
    if (apiError(error).code === "CONFLICT") {
      return { values, error: { code: "CONFLICT", message: "A customer with this email or phone number already exists." } };
    }
    log.error({ err: String(error), userId }, "customer update failed");
    return { values, error: { code: "INTERNAL_ERROR", message: "The customer could not be saved. Try again." } };
  }
  if (!updated) notFound();
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/customers/${customerId}/edit`);
  redirect(`/customers/${customerId}`);
}
