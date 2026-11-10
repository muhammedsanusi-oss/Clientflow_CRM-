/*
 * Code guide: apps/web/app/api/sites/[businessId]/contact/route.ts
 * POST /api/sites/[businessId]/contact: public website contact submission. Checks same origin, a configured
 * site, the 8 KiB body limit, and shared validation; saves an inquiry in that business inbox without sending
 * email.
 */
/*
 * Import connection: ../../../../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * getPublicWebsite: Returns only configured sites and explicitly allowlisted public business/content fields.
 * Owner credentials, CRM records, and revision authors are not part of this projection. Defined in
 * packages/domain/src/websites.ts.
 * WebsiteContact: Strict public contact-message schema, including its hidden honeypot field. Defined in
 * packages/domain/src/websites.ts.
 * submitWebsiteInquiry: Checks the public site, silently discards honeypot spam, applies the persisted
 * per-business submission limit, and saves the inquiry to that business inbox. Defined in
 * packages/domain/src/websites.ts.
 * apiError: Maps deliberate domain failures and known database conflicts into a safe public
 * code/message/status. Unexpected exceptions become a generic error. Defined in
 * packages/domain/src/errors.ts.
 */
import { getPublicWebsite, WebsiteContact, submitWebsiteInquiry, apiError } from "../../../../../../../packages/domain/src/index";
// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";
const failure = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, {
  status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "900" } : {}) },
});
/*
 * POST handler. POST /api/sites/[businessId]/contact: public website contact submission. Checks same origin,
 * a configured site, the 8 KiB body limit, and shared validation; saves an inquiry in that business inbox
 * without sending email.
 */
export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return failure("FORBIDDEN", "Submit this request from the business website.", 403);
  const { businessId } = await params;
  try {
    if (!await getPublicWebsite(businessId)) return failure("NOT_FOUND", "Website not found", 404);
    const reader = request.body?.getReader();
    if (!reader) return failure("VALIDATION", "Enter your contact details and message.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > 8192) { await reader.cancel(); return failure("PAYLOAD_TOO_LARGE", "Your message is too large.", 413); }
      chunks.push(result.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return failure("BAD_JSON", "Body must be valid JSON", 400); }
    const parsed = WebsiteContact.safeParse(body);
    if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0].message, 400);
    await submitWebsiteInquiry(businessId, parsed.data);
    return Response.json({ ok: true, message: "Your message has been delivered to the business." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const mapped = apiError(error);
    return failure(mapped.code, mapped.message, mapped.status);
  }
}
