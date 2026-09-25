"use server";

import { currentUserId } from "@project/auth";
import {
  createCustomerNoteForUser,
  createCustomerNoteInputSchema,
} from "@project/domain";
import { log } from "@project/log";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AddCustomerNoteActionState = {
  value?: string;
  fieldErrors?: {
    content?: string[];
  };
  error?: {
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";
    message: string;
  };
};

function readString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function addCustomerNoteAction(
  _previousState: AddCustomerNoteActionState,
  formData: FormData,
): Promise<AddCustomerNoteActionState> {
  const userId = await currentUserId();
  const customerId = readString(formData, "customerId");
  const content = readString(formData, "content");
  const parsed = createCustomerNoteInputSchema.safeParse({
    customerId,
    content,
  });

  if (!parsed.success) {
    return {
      value: content,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: {
        code: "VALIDATION_ERROR",
        message: "Review the highlighted field.",
      },
    };
  }

  try {
    const created = await createCustomerNoteForUser(userId, parsed.data);

    if (!created) {
      return {
        value: content,
        error: {
          code: "NOT_FOUND",
          message: "The customer could not be found.",
        },
      };
    }
  } catch (error) {
    log.error(
      { err: String(error), userId, customerId },
      "customer note creation failed",
    );

    return {
      value: content,
      error: {
        code: "INTERNAL_ERROR",
        message: "The note could not be saved. Try again.",
      },
    };
  }

  const customerPath = `/customers/${parsed.data.customerId}`;
  revalidatePath(customerPath);
  redirect(customerPath);
}
