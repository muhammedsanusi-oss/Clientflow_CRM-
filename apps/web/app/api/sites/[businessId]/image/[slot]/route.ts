import { getPublicWebsiteImage } from "@project/domain";
import { downloadWebsiteImage } from "@project/services";
import { routeErrorResponse } from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";
const missingImage = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_: Request, { params }: { params: Promise<{ businessId: string; slot: string }> }) {
  const { businessId, slot: locator } = await params;
  try {
    const imageRef = await getPublicWebsiteImage(businessId, locator);
    if (!imageRef) return missingImage();
    const image = await downloadWebsiteImage(imageRef);
    if (!image || !["image/jpeg", "image/png", "image/webp"].includes(image.contentType)) return missingImage();
    const body = image.data.buffer.slice(image.data.byteOffset, image.data.byteOffset + image.data.byteLength) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
