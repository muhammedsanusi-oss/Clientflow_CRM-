/*
 * Code guide: packages/domain/src/errors.ts
 * Public domain-error vocabulary and safe database-error mapping. Routes/actions use this boundary to avoid
 * exposing raw database details to the browser.
 */
export class DomainError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED", message: string) {
    super(message);
  }
}

/*
 * Maps deliberate domain failures and known database conflicts into a safe public code/message/status.
 * Unexpected exceptions become a generic error.
 */
export function apiError(error: unknown) {
  // Only deliberate domain errors may carry a public message. Database
  // exceptions can contain private row values or connection details.
  if (error instanceof DomainError) {
    return { status: error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : error.code === "RATE_LIMITED" ? 429 : 403, code: error.code, message: error.message };
  }
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  // PGlite's adapter exposes SQLSTATE in cause rather than Prisma's P-code.
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : undefined;
  const sqlState = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
  if (code === "P2002" || sqlState === "23505") return { status: 409, code: "CONFLICT", message: "A record with these details already exists" };
  if (code === "P2025" || code === "P2003" || sqlState === "23503") return { status: 404, code: "NOT_FOUND", message: "Resource not found" };
  return { status: 500, code: "INTERNAL_ERROR", message: "Something went wrong" };
}
