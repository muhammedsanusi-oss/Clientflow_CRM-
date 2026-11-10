/*
 * Code guide: packages/services/tests/storage.test.ts
 * Automated regression tests for safeBlobName. Assertions document expected behavior and failure cases;
 * inspect beforeAll/mocks for setup. Database suites use disposable PGlite rather than changing the running
 * local project data.
 */
/*
 * Import connection: vitest.
 * Test runner assertions, lifecycle hooks, spies, and mocks. This import is test support, not a production
 * API.
 * describe: Groups related regression scenarios in the test runner.
 * it: Defines a scenario whose assertions must pass.
 * expect: Checks actual values or failures against the expected behavior.
 */
import { describe, it, expect } from "vitest";
/*
 * Import connection: ../src/storage -> packages/services/src/storage.ts.
 * safeBlobName: Sanitizes the user-supplied filename and namespaces it under the supplied item ID; callers
 * remain responsible for authorization.
 */
import { safeBlobName, websiteImageExtension, MAX_WEBSITE_IMAGE_BYTES } from "../src/storage";

describe("safeBlobName", () => {
  it("namespaces by item id", () => {
    expect(safeBlobName("item1", "resume.pdf")).toBe("item1/resume.pdf");
  });
  it("neutralizes path traversal", () => {
    expect(safeBlobName("item1", "../../etc/passwd")).toBe("item1/__etc_passwd");
    expect(safeBlobName("item1", "a/b/c.pdf")).not.toContain("a/b");
  });

  it("handles empty and hostile names", () => {
    expect(safeBlobName("item1", "")).toBe("item1/file");
    expect(safeBlobName("item1", "  spaces & symbols!.png")).toBe("item1/__spaces___symbols_.png");
  });

  it("caps absurdly long names", () => {
    const name = safeBlobName("item1", "x".repeat(500) + ".pdf");
    expect(name.length).toBeLessThanOrEqual("item1/".length + 100);
  });
});

describe("websiteImageExtension", () => {
  it("accepts images with a matching MIME type and file signature", () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0, 0, 0, 0, 0x49, 0x44, 0x41, 0x54,
      0, 0, 0, 0,
      0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0,
    ]);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 12, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20, 0, 0, 0, 0,
    ]);
    expect(websiteImageExtension("image/png", png)).toBe("png");
    expect(websiteImageExtension("image/jpeg", jpeg)).toBe("jpg");
    expect(websiteImageExtension("image/webp", webp)).toBe("webp");
  });

  it("rejects mismatched types, animated formats, and images over the size cap", () => {
    const animatedPng = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0, 0, 0, 4, 0x61, 0x63, 0x54, 0x4c, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const animatedWebp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 12, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      0x41, 0x4e, 0x49, 0x4d, 0, 0, 0, 0,
    ]);
    expect(websiteImageExtension("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(websiteImageExtension("image/jpeg", animatedPng)).toBeNull();
    expect(websiteImageExtension("image/png", animatedPng)).toBeNull();
    expect(websiteImageExtension("image/webp", animatedWebp)).toBeNull();
    expect(websiteImageExtension("image/jpeg", new Uint8Array(MAX_WEBSITE_IMAGE_BYTES + 1))).toBeNull();
  });
});