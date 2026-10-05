import { currentUserId } from "@project/auth";
import { CreateEmployee, createEmployee } from "@project/domain";
import { errorResponse } from "../../../error-response";

export const dynamic = "force-dynamic";

const unauthenticated = () =>
  Response.json(
    { error: { code: "UNAUTHENTICATED", message: "Sign in first" } },
    { status: 401 }
  );

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return unauthenticated();

  const { id: businessId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: "BAD_JSON", message: "Body must be valid JSON" } },
      { status: 400 }
    );
  }

  const parsed = CreateEmployee.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  try {
    const employee = await createEmployee(businessId, userId, parsed.data);
    return Response.json({ employee }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
