/*
 * Code guide: apps/web/app/api/error-response.ts
 * Small adapter from domain errors to the standard HTTP JSON error envelope used by business management
 * routes.
 */
/*
 * Import connection: ../../../../packages/domain/src/errors -> packages/domain/src/errors.ts.
 * apiError: Maps deliberate domain failures and known database conflicts into a safe public
 * code/message/status. Unexpected exceptions become a generic error.
 */
import { apiError } from "../../../../packages/domain/src/errors";

/*
 * Wraps the mapped public code/message in the shared JSON error shape with its HTTP status.
 */
export function errorResponse(error: unknown) {
  // All business routes share one envelope; never serialize an exception.
  const { status, code, message } = apiError(error);
  return Response.json({ error: { code, message } }, { status });
}
