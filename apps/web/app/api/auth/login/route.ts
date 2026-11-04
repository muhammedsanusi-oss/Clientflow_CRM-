import { authenticate, startSession } from "../../../../../../packages/auth/src/index";
import { PasswordLogin, ensureLocalTestAccounts } from "../../../../../../packages/domain/src/index";
import { authError, rejectCrossOrigin } from "../helpers";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req); if (rejected) return rejected;
  let body: unknown; try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_JSON", message: "Body must be valid JSON" } }, { status: 400 }); }
  const parsed = PasswordLogin.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", message: "Enter a valid email and password." } }, { status: 400 });
  try {
    await ensureLocalTestAccounts(parsed.data.email);
    const result = await authenticate(parsed.data.email, parsed.data.password, parsed.data.accountType);
    await startSession(result);
    return Response.json({ redirectTo: result.redirectTo }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authError(error); }
}
