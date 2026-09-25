"use server";

import { currentUserId } from "@project/auth";
import {
  createCustomerForUser,
  createCustomerInputSchema,
} from "@project/domain";
import type { CreateCustomerInput } from "@project/domain";
import { log } from "@project/log";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AddCustomerActionState = {
  values?: Record<keyof CreateCustomerInput, string>;
  fieldErrors?: Partial<
    Record<keyof CreateCustomerInput, string[] | undefined>
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

function hasErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export async function addCustomerAction(
  _previousState: AddCustomerActionState,
  formData: FormData,
): Promise<AddCustomerActionState> {
  const userId = await currentUserId();

  const values: Record<keyof CreateCustomerInput, string> = {
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

  if (!parsed.success) {
    return {
      values,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: {
        code: "VALIDATION_ERROR",
        message: "Review the highlighted fields.",
      },
    };
  }

  try {
    const created = await createCustomerForUser(userId, parsed.data);

    if (!created) {
      return {
        values,
        error: {
          code: "NOT_FOUND",
          message: "Your business could not be found.",
        },
      };
    }
  } catch (error) {
    if (hasErrorCode(error, "P2002")) {
      return {
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
      values,
      error: {
        code: "INTERNAL_ERROR",
        message: "The customer could not be created. Try again.",
      },
    };
  }

  revalidatePath("/customers");
  redirect("/customers");
}
