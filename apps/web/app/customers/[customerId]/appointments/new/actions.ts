"use server";

import { currentUserId } from "@project/auth";
import {
  createAppointmentForUser,
  createAppointmentInputSchema,
} from "@project/domain";
import type { CreateAppointmentInput } from "@project/domain";
import { log } from "@project/log";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ScheduleAppointmentActionState = {
  values?: Record<keyof CreateAppointmentInput, string>;
  fieldErrors?: Partial<
    Record<keyof CreateAppointmentInput, string[] | undefined>
  >;
  error?: {
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";
    message: string;
  };
};

function readString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function scheduleAppointmentAction(
  _previousState: ScheduleAppointmentActionState,
  formData: FormData,
): Promise<ScheduleAppointmentActionState> {
  const userId = await currentUserId();
  const values: Record<keyof CreateAppointmentInput, string> = {
    customerId: readString(formData, "customerId"),
    locationId: readString(formData, "locationId"),
    serviceId: readString(formData, "serviceId"),
    date: readString(formData, "date"),
    startTime: readString(formData, "startTime"),
    details: readString(formData, "details"),
  };
  const parsed = createAppointmentInputSchema.safeParse(values);

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
    const appointment = await createAppointmentForUser(userId, parsed.data);

    if (!appointment) {
      return {
        values,
        error: {
          code: "NOT_FOUND",
          message: "The customer, service, or location could not be found.",
        },
      };
    }
  } catch (error) {
    log.error(
      { err: String(error), userId, customerId: parsed.data.customerId },
      "appointment creation failed",
    );

    return {
      values,
      error: {
        code: "INTERNAL_ERROR",
        message: "The appointment could not be scheduled. Try again.",
      },
    };
  }

  revalidatePath("/calendar");
  revalidatePath(`/customers/${parsed.data.customerId}`);
  redirect(`/calendar?month=${parsed.data.date.slice(0, 7)}`);
}
