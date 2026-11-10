import { currentUserId } from "@project/auth";
import { assertWebsiteImageUploadAllowed, apiError } from "@project/domain";
import { log } from "@project/log";
import {
  MAX_WEBSITE_IMAGE_BYTES,
  uploadWebsiteImage,
  websiteImageExtension,
  isWebsiteImageSection,
} from "@project/services";
import { routeErrorResponse, unauthenticatedResponse } from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";
const MAX_MULTIPART_BYTES = MAX_WEBSITE_IMAGE_BYTES + 16 * 1024;

function failure(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

async function readLimitedBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MULTIPART_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > MAX_MULTIPART_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string; slot: string }> }) {
  const userId = await currentUserId();
  if (!userId) return unauthenticatedResponse();
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return failure("FORBIDDEN", "Upload the image from the website editor.", 403);
  }
  const { businessId, slot: rawSection } = await params;
  if (!isWebsiteImageSection(rawSection)) return failure("NOT_FOUND", "Website section not found.", 404);
  try {
    await assertWebsiteImageUploadAllowed(userId, businessId, rawSection);
    const body = await readLimitedBody(request);
    if (!body) return failure("PAYLOAD_TOO_LARGE", "Image upload is too large.", 413);
    const contentType = request.headers.get("content-type");
    if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) {
      return failure("VALIDATION", "Choose a JPG, PNG, or WebP image.", 400);
    }
    let form: FormData;
    try {
      form = await new Response(body, { headers: { "content-type": contentType } }).formData();
    } catch {
      return failure("VALIDATION", "Choose a valid image file.", 400);
    }
    const file = form.get("image");
    if (typeof file === "string" || !file) return failure("VALIDATION", "Choose an image to upload.", 400);
    if (file.size > MAX_WEBSITE_IMAGE_BYTES) return failure("PAYLOAD_TOO_LARGE", "Images must be 5 MB or smaller.", 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!websiteImageExtension(file.type, bytes)) {
      return failure("VALIDATION", "Use a valid JPG, PNG, or WebP image no larger than 5 MB.", 400);
    }
    const imageRef = await uploadWebsiteImage(businessId, rawSection, file.type, bytes);
    return Response.json({ imageRef }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const mapped = apiError(error);
    if (mapped.status !== 500) return failure(mapped.code, mapped.message, mapped.status);
    log.error({ err: error }, "Website image upload failed");
    return routeErrorResponse(error);
  }
}
