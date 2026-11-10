import {
  apiError,
  bookingDateSchema,
  createPublicBooking,
  getPublicBookingAvailability,
  getPublicBookingOptions,
  publicBookingInputSchema,
} from "../../../../../../../packages/domain/src/index";

export const dynamic = "force-dynamic";

const failure = (code: string, message: string, status: number) => Response.json(
  { error: { code, message } },
  { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "900" } : {}) } },
);

async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return { error: failure("VALIDATION", "Enter your contact details and booking choices.", 400) };
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      return { error: failure("PAYLOAD_TOO_LARGE", "Your booking details are too large.", 413) };
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { body: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { error: failure("BAD_JSON", "Body must be valid JSON.", 400) };
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!await getPublicBookingOptions(businessId)) return failure("NOT_FOUND", "Booking choices are unavailable.", 404);
    const query = new URL(request.url).searchParams;
    const date = bookingDateSchema.safeParse(query.get("date"));
    const serviceId = query.get("serviceId") ?? "";
    const locationId = query.get("locationId") ?? "";
    const staffId = query.get("staffId") ?? "";
    if (!date.success || !serviceId || serviceId.length > 100 || !locationId || locationId.length > 100 || staffId.length > 100) {
      return failure("VALIDATION", "Choose a valid service, location, staff member, and date.", 400);
    }
    const times = await getPublicBookingAvailability(businessId, date.data, serviceId, locationId, staffId);
    if (times === null) return failure("NOT_FOUND", "Booking choices are unavailable.", 404);
    return Response.json({ times }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const mapped = apiError(error);
    if (mapped.code === "NOT_FOUND") return failure(mapped.code, "Booking choices are unavailable.", mapped.status);
    return failure(mapped.code, mapped.message, mapped.status);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return failure("FORBIDDEN", "Submit this booking from the business website.", 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return failure("VALIDATION", "Submit booking details as JSON.", 415);
  }
  try {
    const { businessId } = await params;
    if (!await getPublicBookingOptions(businessId)) return failure("NOT_FOUND", "Booking choices are unavailable.", 404);
    const requestBody = await readJson(request);
    if ("error" in requestBody) return requestBody.error;
    const parsed = publicBookingInputSchema.safeParse(requestBody.body);
    if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Check your booking details.", 400);
    const booking = await createPublicBooking(businessId, parsed.data);
    return Response.json({ ok: true, confirmed: booking.accepted }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const mapped = apiError(error);
    if (mapped.code === "NOT_FOUND") return failure(mapped.code, "Booking choices are unavailable.", mapped.status);
    return failure(mapped.code, mapped.message, mapped.status);
  }
}
