/*
 * Code guide: apps/web/app/api/customers/route.ts
 * Authenticated camelCase customer JSON API. GET lists the authorized business customers; POST validates
 * contact fields and creates a customer. Internal database metadata is copied into an explicit response
 * shape.
 */
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
 * getCustomerCollectionForUser: Validates search text and loads the selected authorized business customer
 * projection. Search terms match names, email, or phone; returns null when the business is unavailable.
 * Defined in packages/domain/src/customers.ts.
 */
import {
  apiError,
  createCustomerForUser,
  createCustomerInputSchema,
  getCustomerCollectionForUser,
} from "@project/domain";
/*
 * Import connection: @project/log -> packages/log/src/index.ts.
 * log: Shared pino logger from packages/log for structured server diagnostics.
 */
import { log } from "@project/log";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

// Type contract: ApiCustomer. Describes values accepted/returned by the code below; TypeScript removes this
// declaration from the runtime bundle.
type ApiCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  address: string;
  preferredContactMethod: "PHONE" | "EMAIL" | "TEXT";
};

// Type contract: CustomerRecord. Describes values accepted/returned by the code below; TypeScript removes
// this declaration from the runtime bundle.
type CustomerRecord = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  address: string;
  preferred_contact_method: "PHONE" | "EMAIL" | "TEXT";
};

// Build the public DTO field-by-field so tenant and persistence metadata can
// never leak when the Prisma selection changes later.
/*
 * Copies the allowlisted database contact fields into the camelCase customer API response; internal
 * persistence fields are omitted.
 */
function toApiCustomer(customer: CustomerRecord): ApiCustomer {
  return {
    id: customer.id,
    firstName: customer.first_name,
    lastName: customer.last_name,
    phoneNumber: customer.phone_number,
    email: customer.email,
    address: customer.address,
    preferredContactMethod: customer.preferred_contact_method,
  };
}

/*
 * Wraps the mapped public code/message in the shared JSON error shape with its HTTP status.
 */
function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

/*
 * GET handler. Authenticated camelCase customer JSON API. GET lists the authorized business customers; POST
 * validates contact fields and creates a customer. Internal database metadata is copied into an explicit
 * response shape.
 */
export async function GET(request: Request) {
  // Resolve identity before touching customer data; every domain query starts
  // from this server-derived user rather than a client-supplied tenant ID.
  let userId: string;
  try {
    // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
    // not trusted here.
    const signedInUserId = await currentUserId();
    if (!signedInUserId) return errorResponse("UNAUTHENTICATED", "Sign in first", 401);
    userId = signedInUserId;
  } catch (error) {
    log.error({ err: String(error) }, "customer API identity failed");
    return errorResponse(
      "INTERNAL_ERROR",
      "Customers could not be loaded. Try again.",
      500,
    );
  }

  try {
    const businessId = new URL(request.url).searchParams.get("businessId") ?? undefined;
    const customers = await getCustomerCollectionForUser(userId, businessId);

    if (!customers) {
      return errorResponse(
        "NOT_FOUND",
        "Your business could not be found.",
        404,
      );
    }

    return Response.json({
      data: { customers: customers.map(toApiCustomer) },
    });
  } catch (error) {
    log.error({ err: String(error), userId }, "customer API list failed");
    return errorResponse(
      "INTERNAL_ERROR",
      "Customers could not be loaded. Try again.",
      500,
    );
  }
}

/*
 * POST handler. Authenticated camelCase customer JSON API. GET lists the authorized business customers; POST
 * validates contact fields and creates a customer. Internal database metadata is copied into an explicit
 * response shape.
 */
export async function POST(request: Request) {
  let userId: string;
  try {
    // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
    // not trusted here.
    const signedInUserId = await currentUserId();
    if (!signedInUserId) return errorResponse("UNAUTHENTICATED", "Sign in first", 401);
    userId = signedInUserId;
  } catch (error) {
    log.error({ err: String(error) }, "customer API identity failed");
    return errorResponse(
      "INTERNAL_ERROR",
      "The customer could not be created. Try again.",
      500,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "VALIDATION_ERROR",
      "Request body must be valid JSON.",
      400,
    );
  }

  // The strict shared schema rejects unknown ownership fields as well as
  // malformed customer fields before any database operation can run.
  const parsed = createCustomerInputSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Review the submitted customer fields.",
      400,
    );
  }

  try {
    const businessId = new URL(request.url).searchParams.get("businessId") ?? undefined;
    const customer = await createCustomerForUser(userId, parsed.data, businessId);

    if (!customer) {
      return errorResponse(
        "NOT_FOUND",
        "Your business could not be found.",
        404,
      );
    }

    return Response.json(
      { data: { customer: toApiCustomer(customer) } },
      { status: 201 },
    );
  } catch (error) {
    // Normalize both Prisma and adapter errors without exposing stored values.
    if (apiError(error).code === "CONFLICT") {
      return errorResponse(
        "CONFLICT",
        "A customer with this email or phone number already exists.",
        409,
      );
    }

    log.error({ err: String(error), userId }, "customer API create failed");
    return errorResponse(
      "INTERNAL_ERROR",
      "The customer could not be created. Try again.",
      500,
    );
  }
}
