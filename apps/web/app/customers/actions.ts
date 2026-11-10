/*
 * Code guide: apps/web/app/customers/actions.ts
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
 * apiError: Maps deliberate domain failures and known database conflicts into a safe public
 * code/message/status. Unexpected exceptions become a generic error. Defined in
 * packages/domain/src/errors.ts.
 * createCustomerForUser: Resolves an authorized business before creating a customer. The businessId hint
 * cannot assign the customer to an unrelated tenant. Defined in packages/domain/src/customers.ts.
 * createCustomerInputSchema: Strict camelCase contact-field validator shared by customer forms and the
 * customer JSON API. Defined in packages/domain/src/customers.ts.
 */
import {
  apiError,
  createCustomerForUser,
  createCustomerInputSchema,
} from "@project/domain";
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * Type CustomerFormInput: Type inferred from the UI customer input schema. Defined in
 * packages/domain/src/customers.ts.
 */
import type { CustomerFormInput } from "@project/domain";
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
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 */
import { redirect, notFound } from "next/navigation";

// Type contract: AddCustomerActionState. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
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

/*
 * Reads a form field only when it is a string, so unexpected FormData values do not become trusted input.
 */
function readString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/*
 * Reads and validates the browser form, creates the customer in an authorized business, handles duplicates,
 * and redirects to that business customer list.
 */
export async function addCustomerAction(
  _previousState: AddCustomerActionState,
  formData: FormData,
): Promise<AddCustomerActionState> {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
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
