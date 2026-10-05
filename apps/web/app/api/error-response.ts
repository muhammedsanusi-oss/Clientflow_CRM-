import { apiError } from "../../../../packages/domain/src/errors";

export function errorResponse(error: unknown) {
  // All business routes share one envelope; never serialize an exception.
  const { status, code, message } = apiError(error);
  return Response.json({ error: { code, message } }, { status });
}
