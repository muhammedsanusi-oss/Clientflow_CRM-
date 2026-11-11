import { timingSafeEqual } from "node:crypto";
import { apiError, ExternalMonitorEvent, receiveExternalMonitorEvent } from "@project/domain";

export const dynamic = "force-dynamic";
const failure = (code: string, message: string, status: number) => Response.json(
  { error: { code, message } },
  { status, headers: { "Cache-Control": "no-store" } },
);

export async function POST(request: Request) {
  const secret = process.env.UPTIME_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) return failure("NOT_CONFIGURED", "Monitoring webhook is not configured.", 503);
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    return failure("UNAUTHENTICATED", "Invalid monitor credentials.", 401);
  }

  const reader = request.body?.getReader();
  if (!reader) return failure("BAD_JSON", "Monitor event body is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      return failure("PAYLOAD_TOO_LARGE", "Monitor event is too large.", 413);
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { return failure("BAD_JSON", "Body must be valid JSON.", 400); }
  const parsed = ExternalMonitorEvent.safeParse(body);
  if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0].message, 400);
  try {
    const result = await receiveExternalMonitorEvent(parsed.data);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const mapped = apiError(error);
    return failure(mapped.code, mapped.message, mapped.status);
  }
}
