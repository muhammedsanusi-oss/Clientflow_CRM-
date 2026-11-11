import { authenticate, startSession } from "../../../../../../packages/auth/src/index";
import { apiError, createLocalOwnerSignup, isLocalOwnerSignupEnabled, OwnerSignup } from "../../../../../../packages/domain/src/index";
import { authError, rejectCrossOrigin } from "../helpers";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 16 * 1024;
const unavailable = () => Response.json(
  { error: { code: "NOT_FOUND", message: "Resource not found" } },
  { status: 404, headers: { "Cache-Control": "no-store" } },
);

export async function POST(req: Request) {
  if (!isLocalOwnerSignupEnabled()) return unavailable();
  const rejected = rejectCrossOrigin(req);
  if (rejected) return rejected;

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return Response.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Signup details are too large." } }, { status: 413 });
  }

  let body: unknown;
  try { body = JSON.parse(rawBody); }
  catch { return Response.json({ error: { code: "BAD_JSON", message: "Body must be valid JSON." } }, { status: 400 }); }

  const parsed = OwnerSignup.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Review the signup details." } }, { status: 400 });
  }

  let created: Awaited<ReturnType<typeof createLocalOwnerSignup>>;
  try { created = await createLocalOwnerSignup(parsed.data); }
  catch (error) {
    const mapped = apiError(error);
    return Response.json({ error: { code: mapped.code, message: mapped.message } }, { status: mapped.status, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const session = await authenticate(created.ownerEmail, parsed.data.password, "owner");
    await startSession(session);
    return Response.json({ redirectTo: `/subscription?businessId=${created.business.id}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authError(error); }
}
