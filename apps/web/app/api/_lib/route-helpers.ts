/*
 * Code guide: apps/web/app/api/_lib/route-helpers.ts
 * Reusable private API plumbing: persisted identity, active business access, JSON/schema parsing, and safe
 * status/error responses. Resource routes import these helpers instead of duplicating the boundary.
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
 * getBusinessById: Reads one business through the supplied user active membership; it is also the API access
 * precheck. Defined in packages/domain/src/queries/business.ts.
 */
import { getBusinessById } from "@project/domain";
/*
 * Import connection: @project/log -> packages/log/src/index.ts.
 * log: Shared pino logger from packages/log for structured server diagnostics.
 */
import { log } from "@project/log";

// Type contract: ValidationSchema. Describes values accepted/returned by the code below; TypeScript removes
// this declaration from the runtime bundle.
type ValidationSchema<T> = {
  safeParse(input: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ message: string }> } };
};

/*
 * API helper that delegates identity resolution to the persisted-session auth package.
 */
export async function authenticatedUserId() {
  // URL/body IDs are lookup keys only; the persisted session establishes request identity.
  return currentUserId();
}

/*
 * Builds the shared 401 JSON error envelope when a private API has no authenticated user.
 */
export function unauthenticatedResponse() {
  return Response.json(
    { error: { code: "UNAUTHENTICATED", message: "Sign in first" } },
    { status: 401 },
  );
}

/*
 * Builds the shared 404 JSON envelope without revealing whether an unknown or foreign record exists.
 */
export function notFoundResponse() {
  return Response.json(
    { error: { code: "NOT_FOUND", message: "Resource not found" } },
    { status: 404 },
  );
}

/*
 * Verifies active membership through getBusinessById before business-scoped collection operations.
 */
export async function hasBusinessAccess(businessId: string, userId: string) {
  return Boolean(await getBusinessById(businessId, userId));
}

/*
 * Parses JSON and applies the supplied shared schema. Returns either validated data or the standard
 * client-error response.
 */
export async function parseRequestBody<T>(request: Request, schema: ValidationSchema<T>) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      response: Response.json(
        { error: { code: "BAD_JSON", message: "Body must be valid JSON" } },
        { status: 400 },
      ),
    } as const;
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: Response.json(
        { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      ),
    } as const;
  }

  return { data: parsed.data } as const;
}

/*
 * Maps known Prisma conflicts/not-found failures and logs unexpected errors before returning a safe generic
 * API response.
 */
export function routeErrorResponse(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;

  if (code === "P2002" || code === "P2003") {
    return Response.json(
      { error: { code: "CONFLICT", message: "The request conflicts with an existing record" } },
      { status: 409 },
    );
  }
  if (code === "P2025") return notFoundResponse();

  log.error({ err: error }, "API route failed");
  return Response.json(
    { error: { code: "INTERNAL", message: "An unexpected error occurred" } },
    { status: 500 },
  );
}
