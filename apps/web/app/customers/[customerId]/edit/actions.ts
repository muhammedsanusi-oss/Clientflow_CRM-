/*
 * Code guide: apps/web/app/customers/[customerId]/edit/actions.ts
 * Checks customer access and submitted contact fields, applies the scoped update, and refreshes
 * list/detail/edit routes before returning to details.
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
 * createCustomerInputSchema: Strict camelCase contact-field validator shared by customer forms and the
 * customer JSON API. Defined in packages/domain/src/customers.ts.
 * getCustomerWithNotesForUser: Loads an authorized customer and the allowed shared notes plus author display
 * names for the detail and edit pages. Defined in packages/domain/src/customers.ts.
 * updateCustomerForUser: Updates only contact fields, with active membership included in the database update
 * predicate. Returns whether exactly one authorized customer was updated. Defined in
 * packages/domain/src/customers.ts.
 */
import { apiError, createCustomerInputSchema, getCustomerWithNotesForUser, updateCustomerForUser } from "@project/domain";
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
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { notFound, redirect } from "next/navigation";

// Type contract: EditCustomerState. Describes values accepted/returned by the code below; TypeScript removes
// this declaration from the runtime bundle.
export type EditCustomerState = {
  values?: Record<keyof CustomerFormInput, string>;
  fieldErrors?: Partial<Record<keyof CustomerFormInput, string[]>>;
  error?: { code: string; message: string };
};

/*
 * Checks customer access and submitted contact fields, applies the scoped update, and refreshes
 * list/detail/edit routes before returning to details.
 */
export async function editCustomerAction(_previous: EditCustomerState, form: FormData): Promise<EditCustomerState> {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
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
