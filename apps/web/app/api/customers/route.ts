import { currentUserId } from "@project/auth";
import {
  createCustomerForUser,
  createCustomerInputSchema,
  getCustomerCollectionForUser,
} from "@project/domain";
import { log } from "@project/log";

export const dynamic = "force-dynamic";

type ApiCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  address: string;
  preferredContactMethod: "PHONE" | "EMAIL" | "TEXT";
};

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

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function hasErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export async function GET() {
  // Resolve identity before touching customer data; every domain query starts
  // from this server-derived user rather than a client-supplied tenant ID.
  let userId: string;
  try {
    userId = await currentUserId();
  } catch (error) {
    log.error({ err: String(error) }, "customer API identity failed");
    return errorResponse(
      "INTERNAL_ERROR",
      "Customers could not be loaded. Try again.",
      500,
    );
  }

  try {
    const customers = await getCustomerCollectionForUser(userId);

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

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await currentUserId();
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
    const customer = await createCustomerForUser(userId, parsed.data);

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
    // Both business-scoped unique indexes use Prisma's P2002 code. Keep the
    // response intentionally generic so it does not reveal which value exists.
    if (hasErrorCode(error, "P2002")) {
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
