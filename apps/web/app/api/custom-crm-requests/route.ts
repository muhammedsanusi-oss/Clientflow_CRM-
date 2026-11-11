import { apiError, CustomCrmRequest, submitCustomCrmRequest } from "@project/domain";

export const dynamic = "force-dynamic";
const failure = (code: string, message: string, status: number) => Response.json(
  { error: { code, message } },
  { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "900" } : {}) } },
);

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return failure("FORBIDDEN", "Submit this request from the Clientflow website.", 403);
  }
  const reader = request.body?.getReader();
  if (!reader) return failure("VALIDATION", "Enter your contact details and request.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      return failure("PAYLOAD_TOO_LARGE", "Your request is too large.", 413);
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }

  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { return failure("BAD_JSON", "Body must be valid JSON.", 400); }
  const parsed = CustomCrmRequest.safeParse(body);
  if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0].message, 400);
  try {
    await submitCustomCrmRequest(parsed.data);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const mapped = apiError(error);
    return failure(mapped.code, mapped.message, mapped.status);
  }
}
