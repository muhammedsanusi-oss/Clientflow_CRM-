/*
 * Code guide: apps/web/app/customers/[customerId]/appointments/new/actions.ts
 * Reads a form field only when it is a string, so unexpected FormData values do not become trusted input.
 * Exported actions run on the server; browser forms cannot call the database directly.
 */
"use server";

/*
 * Import connection: @project/auth -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "@project/auth";
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * createAppointmentForUser: Derives the scheduler membership, checks customer/location/service ownership,
 * calculates duration, and atomically creates the appointment with its service-price snapshot. Defined in
 * packages/domain/src/appointments.ts.
 * createAppointmentInputSchema: Strict UI scheduling validator for customer, location, service, date, time
 * slot, and details. Defined in packages/domain/src/appointments.ts.
 */
import {
  apiError,
  createAppointmentForUser,
  createAppointmentInputSchema,
} from "@project/domain";
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * Type ScheduleAppointmentInput: Type for the scheduling form payload. Defined in
 * packages/domain/src/appointments.ts.
 */
import type { ScheduleAppointmentInput } from "@project/domain";
/*
 * Import connection: @project/log -> packages/log/src/index.ts.
 * log: Shared pino logger from packages/log for structured server diagnostics.
 */
import { log } from "@project/log";
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

// Type contract: ScheduleAppointmentActionState. Describes values accepted/returned by the code below;
// TypeScript removes this declaration from the runtime bundle.
export type ScheduleAppointmentActionState = {
  values?: Record<keyof ScheduleAppointmentInput, string>;
  fieldErrors?: Partial<
    Record<keyof ScheduleAppointmentInput, string[] | undefined>
  >;
  error?: {
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";
    message: string;
  };
};

/*
 * Reads a form field only when it is a string, so unexpected FormData values do not become trusted input.
 */
function readString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/*
 * Validates submitted scheduling fields, calls the protected appointment write, and redirects to the matching
 * calendar month.
 */
export async function scheduleAppointmentAction(
  _previousState: ScheduleAppointmentActionState,
  formData: FormData,
): Promise<ScheduleAppointmentActionState> {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const values: Record<keyof ScheduleAppointmentInput, string> = {
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
    if (apiError(error).code === "CONFLICT") {
      return {
        values,
        error: {
          code: "CONFLICT",
          message: "That time is already booked. Choose a different time.",
        },
      };
    }
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
