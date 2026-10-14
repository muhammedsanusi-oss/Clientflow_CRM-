import { currentUserId } from "@project/auth";
import { getBusinessById } from "@project/domain";
import { log } from "@project/log";

type ValidationSchema<T> = {
  safeParse(input: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ message: string }> } };
};

export async function authenticatedUserId() {
  return currentUserId();
}

export function unauthenticatedResponse() {
  return Response.json(
    { error: { code: "UNAUTHENTICATED", message: "Sign in first" } },
    { status: 401 },
  );
}

export function notFoundResponse() {
  return Response.json(
    { error: { code: "NOT_FOUND", message: "Resource not found" } },
    { status: 404 },
  );
}

export async function hasBusinessAccess(businessId: string, userId: string) {
  return Boolean(await getBusinessById(businessId, userId));
}

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
