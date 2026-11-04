import { AuthenticationError } from "../../../../../packages/auth/src/index";

export function rejectCrossOrigin(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin) {
    return Response.json({ error: { code: "FORBIDDEN", message: "Submit this request from the application." } }, { status: 403 });
  }
  return null;
}
export function authError(error: unknown) {
  if (error instanceof AuthenticationError) {
    const status = error.code === "RATE_LIMITED" ? 429 : error.code === "VALIDATION" ? 400 : 401;
    return Response.json({ error: { code: error.code, message: error.message } }, {
      status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "900" } : {}) },
    });
  }
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not complete sign-in. Please try again." } }, { status: 500 });
}
