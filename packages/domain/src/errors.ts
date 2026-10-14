export class DomainError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "FORBIDDEN", message: string) {
    super(message);
  }
}

export function apiError(error: unknown) {
  // Only deliberate domain errors may carry a public message. Database
  // exceptions can contain private row values or connection details.
  if (error instanceof DomainError) {
    return { status: error.code === "NOT_FOUND" ? 404 : 403, code: error.code, message: error.message };
  }
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  // PGlite's adapter exposes SQLSTATE in cause rather than Prisma's P-code.
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : undefined;
  const sqlState = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
  if (code === "P2002" || sqlState === "23505") return { status: 409, code: "CONFLICT", message: "A record with these details already exists" };
  if (code === "P2025" || code === "P2003" || sqlState === "23503") return { status: 404, code: "NOT_FOUND", message: "Resource not found" };
  return { status: 500, code: "INTERNAL_ERROR", message: "Something went wrong" };
}
