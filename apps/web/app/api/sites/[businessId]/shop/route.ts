import { getBakeryCatalog, getBakeryQuote, checkoutBakery, trackBakeryOrder } from "../../../../../../../packages/domain/src/index";
import { readShopJson, shopResponse, shopFailure } from "../../shop-http";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params, query = new URL(request.url).searchParams;
    if (request.headers.has("x-order-number")) return shopResponse(await trackBakeryOrder(businessId, "", request.headers.get("x-order-number") ?? ""));
    if (request.headers.has("x-order-token")) return shopResponse(await trackBakeryOrder(businessId, request.headers.get("x-order-token") ?? ""));
    if (query.has("zip")) return shopResponse(await getBakeryQuote(businessId, query.get("zip") ?? ""));
    return shopResponse(await getBakeryCatalog(businessId));
  } catch (error) { return shopFailure(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return shopResponse({ error: { code: "FORBIDDEN", message: "Submit from the bakery website." } }, 403);
  try { const { businessId } = await params; return shopResponse(await checkoutBakery(businessId, await readShopJson(request)), 201); }
  catch (error) { return shopFailure(error); }
}
