import { endSession } from "../../../../../../packages/auth/src/index";
import { authError, rejectCrossOrigin } from "../helpers";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req); if (rejected) return rejected;
  try { await endSession(); return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return authError(error); }
}
