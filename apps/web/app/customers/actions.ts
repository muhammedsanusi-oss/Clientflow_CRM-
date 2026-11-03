"use server";

import { currentUserId } from "@project/auth";
import {
  apiError,
  createCustomerForUser,
  createCustomerInputSchema,
} from "@project/domain";
import type { CustomerFormInput } from "@project/domain";
import { log } from "@project/log";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";

export type AddCustomerActionState = {
  businessId?: string;
  values?: Record<keyof CustomerFormInput, string>;
  fieldErrors?: Partial<
    Record<keyof CustomerFormInput | "businessId", string[] | undefined>
  >;
  error?: {
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";
    message: string;
  };
};

function readString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function addCustomerAction(
  _previousState: AddCustomerActionState,
  formData: FormData,
): Promise<AddCustomerActionState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const businessId = readString(formData, "businessId");

  const values: Record<keyof CustomerFormInput, string> = {
    firstName: readString(formData, "firstName"),
    lastName: readString(formData, "lastName"),
    phoneNumber: readString(formData, "phoneNumber"),
    email: readString(formData, "email"),
    address: readString(formData, "address"),
    preferredContactMethod: readString(
      formData,
      "preferredContactMethod",
    ),
  };

  const parsed = createCustomerInputSchema.safeParse(values);

  if (!parsed.success || !businessId) {
    return {
      businessId,
      values,
      fieldErrors: { ...(!parsed.success ? parsed.error.flatten().fieldErrors : {}), ...(!businessId ? { businessId: ["Choose a business before adding a customer."] } : {}) },
      error: {
        code: "VALIDATION_ERROR",
        message: "Review the highlighted fields.",
      },
    };
  }

  let created = false;
  try {
    created = Boolean(await createCustomerForUser(userId, parsed.data, businessId));
  } catch (error) {
    if (apiError(error).code === "CONFLICT") {
      return {
        businessId,
        values,
        error: {
          code: "CONFLICT",
          message:
            "A customer with this email or phone number already exists.",
        },
      };
    }

    log.error(
      { err: String(error), userId },
      "customer creation failed",
    );

    return {
      businessId,
      values,
      error: {
        code: "INTERNAL_ERROR",
        message: "The customer could not be created. Try again.",
      },
    };
  }
  if (!created) notFound();

  revalidatePath("/customers");
  redirect(`/customers?businessId=${encodeURIComponent(businessId)}`);
}
