import { currentUserId } from "../../../../../../packages/auth/src/index";
import { saveBakeryProduct, saveBakeryDelivery, updateBakeryStatus } from "../../../../../../packages/domain/src/index";
import { readShopJson, shopResponse, shopFailure } from "../../sites/shop-http";

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const userId = await currentUserId();
  if (!userId) return shopResponse({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return shopResponse({ error: { code: "FORBIDDEN", message: "Submit from this website." } }, 403);
  try {
    const { businessId } = await params;
    const body = await readShopJson(request) as { action?: string; value?: unknown };
    if (body?.action === "product") await saveBakeryProduct(userId, businessId, body.value);
    else if (body?.action === "delivery") await saveBakeryDelivery(userId, businessId, body.value);
    else if (body?.action === "status") await updateBakeryStatus(userId, businessId, body.value);
    else return shopResponse({ error: { code: "VALIDATION", message: "Choose a valid action." } }, 400);
    return shopResponse({ ok: true });
  } catch (error) { return shopFailure(error); }
}
