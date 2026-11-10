import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  userId: "owner-id" as string | null,
  assertUploadAllowed: vi.fn(),
  upload: vi.fn(),
  imageExtension: vi.fn(),
}));

vi.mock("@project/auth", () => ({ currentUserId: async () => state.userId }));
vi.mock("@project/domain", () => ({
  assertWebsiteImageUploadAllowed: state.assertUploadAllowed,
  apiError: (error: { code?: string; message?: string }) => ({
    status: error.code === "NOT_FOUND" ? 404 : 500,
    code: error.code ?? "INTERNAL_ERROR",
    message: error.message ?? "Something went wrong",
  }),
}));
vi.mock("@project/services", () => ({
  MAX_WEBSITE_IMAGE_BYTES: 5 * 1024 * 1024,
  uploadWebsiteImage: state.upload,
  websiteImageExtension: state.imageExtension,
  isWebsiteImageSection: (value: string) => /^(header|hero|features|about|offerings|contact|custom)$/.test(value),
}));
vi.mock("@project/log", () => ({ log: { error: vi.fn() } }));
vi.mock("@/app/api/_lib/route-helpers", () => ({
  unauthenticatedResponse: () => Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 }),
  routeErrorResponse: () => Response.json({ error: { code: "INTERNAL" } }, { status: 500 }),
}));

const validImage = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "section.png", { type: "image/png" });
async function post(file: File, slot = "header", origin = "http://localhost") {
  const form = new FormData();
  form.set("image", file);
  const request = new Request(`http://localhost/api/sites/site-id/images/${slot}`, {
    method: "POST",
    headers: { origin },
    body: form,
  });
  const { POST } = await import("../../apps/web/app/api/sites/[businessId]/images/[slot]/route");
  return POST(request, { params: Promise.resolve({ businessId: "site-id", slot }) });
}

describe("website image upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.userId = "owner-id";
    state.assertUploadAllowed.mockResolvedValue(undefined);
    state.upload.mockResolvedValue("site-id/website/header-12345678-1234-1234-1234-123456789abc.png");
    state.imageExtension.mockReturnValue("png");
  });

  it("authenticates, authorizes, and stores the image in the requested business slot", async () => {
    const response = await post(validImage());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ imageRef: "site-id/website/header-12345678-1234-1234-1234-123456789abc.png" });
    expect(state.assertUploadAllowed).toHaveBeenCalledWith("owner-id", "site-id", "header");
    expect(state.upload).toHaveBeenCalledWith("site-id", "header", "image/png", expect.any(Uint8Array));
  });

  it("rejects foreign users before writing an image", async () => {
    state.assertUploadAllowed.mockRejectedValueOnce({ code: "NOT_FOUND", message: "Website not found" });
    const response = await post(validImage(), "hero");
    expect(response.status).toBe(404);
    expect(state.upload).not.toHaveBeenCalled();
  });

  it("rejects invalid image data and oversized requests", async () => {
    state.imageExtension.mockReturnValueOnce(null);
    expect((await post(validImage())).status).toBe(400);
    expect(state.upload).not.toHaveBeenCalled();
    const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    expect((await post(largeFile)).status).toBe(413);
    expect(state.upload).not.toHaveBeenCalled();
  });

  it("requires a same-origin request and a signed-in user", async () => {
    expect((await post(validImage(), "logo", "https://foreign.example")).status).toBe(403);
    state.userId = null;
    expect((await post(validImage())).status).toBe(401);
    expect(state.upload).not.toHaveBeenCalled();
  });

  it("accepts custom section uploads and rejects arbitrary section keys", async () => {
    expect((await post(validImage(), "custom")).status).toBe(200);
    expect(state.upload).toHaveBeenCalledWith("site-id", "custom", "image/png", expect.any(Uint8Array));
    expect((await post(validImage(), "other-business")).status).toBe(404);
  });
});
