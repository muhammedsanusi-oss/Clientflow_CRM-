import { bakeryApiError } from "../../../../../packages/domain/src/bakery";
export function shopResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex", ...(status === 429 ? { "Retry-After": "900" } : {}) } });
}
export function shopFailure(error: unknown) {
  if (error instanceof SyntaxError || error instanceof RangeError) return shopResponse({ error: { code: "VALIDATION", message: "Submit valid JSON of at most 32 KiB." } }, 400);
  const { code, message, status } = bakeryApiError(error); return shopResponse({ error: { code, message } }, status);
}
export async function readShopJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new SyntaxError();
  const reader = request.body?.getReader(); if (!reader) throw new SyntaxError();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const next = await reader.read(); if (next.done) break;
    size += next.value.byteLength;
    if (size > 32768) { await reader.cancel(); throw new RangeError(); }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
