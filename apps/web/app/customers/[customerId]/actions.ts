/*
 * Code guide: apps/web/app/customers/[customerId]/actions.ts
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
 * createCustomerNoteForUser: Resolves the active author membership and checks the customer business inside a
 * transaction before inserting the note. Defined in packages/domain/src/customers.ts.
 * createCustomerNoteInputSchema: Strict validator for the customer lookup ID and a nonempty note. Defined in
 * packages/domain/src/customers.ts.
 */
import {
  createCustomerNoteForUser,
  createCustomerNoteInputSchema,
} from "@project/domain";
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

// Type contract: AddCustomerNoteActionState. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
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

/*
 * Reads a form field only when it is a string, so unexpected FormData values do not become trusted input.
 */
function readString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/*
 * Validates note input, saves it with server-derived authorship, refreshes customer details, and redirects
 * back to the customer.
 */
export async function addCustomerNoteAction(
  _previousState: AddCustomerNoteActionState,
  formData: FormData,
): Promise<AddCustomerNoteActionState> {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
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
