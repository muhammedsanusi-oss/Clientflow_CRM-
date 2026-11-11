import { describe, expect, it } from "vitest";
import { defaultWebsiteContent } from "../src/website-content";
import { countWebsiteImages, WebsiteFeatureRequest } from "../src/website-plans";

describe("website image counting", () => {
  it("counts an empty website as zero images", () => {
    expect(countWebsiteImages(defaultWebsiteContent("CONTACT"))).toBe(0);
  });

  it("counts a reused image once across template, custom, logo, and hero fields", () => {
    const content = defaultWebsiteContent("CONTACT");
    content.sectionImages.header = ["same.png", "same.png"];
    content.sectionImages.hero = ["same.png"];
    content.additionalSections = [{ heading: "About", body: "Our story", images: ["same.png"] }];
    content.logoImage = "same.png";
    content.heroImage = "same.png";
    expect(countWebsiteImages(content)).toBe(1);
  });

  it("includes every image location when counting distinct uploads", () => {
    const content = defaultWebsiteContent("CONTACT");
    content.sectionImages = { header: ["a"], hero: ["b"], features: ["c"], about: ["d"], offerings: ["e"], contact: ["f"] };
    content.additionalSections = [{ heading: "Custom", body: "Text", images: ["g", "h"] }];
    content.logoImage = "i";
    content.heroImage = "j";
    expect(countWebsiteImages(content)).toBe(10);
  });

  it("distinguishes full references even when their filenames match", () => {
    const content = defaultWebsiteContent("CONTACT");
    content.sectionImages.hero = ["first/photo.png", "second/photo.png"];
    expect(countWebsiteImages(content)).toBe(2);
  });

  it("does not remove or reorder image references while counting", () => {
    const content = defaultWebsiteContent("SALON");
    content.sectionImages.hero = ["b", "a", "b"];
    const before = structuredClone(content);
    expect(countWebsiteImages(content)).toBe(2);
    expect(content).toEqual(before);
  });
});

describe("website content defaults", () => {
  it("keeps defaults independent between businesses and editor resets", () => {
    const first = defaultWebsiteContent("SALON");
    const untouched = structuredClone(first);
    first.features.push("Private draft feature");
    first.offerings[0] = "Private draft offering";
    first.sectionImages.hero.push("private-draft.png");
    first.additionalSections.push({ heading: "Draft", body: "Only this site", images: [] });
    expect(defaultWebsiteContent("SALON")).toEqual(untouched);
  });

  it("keeps about text separate from the hero headline", () => {
    const defaults = defaultWebsiteContent("BAKERY");
    const customized = defaultWebsiteContent("BAKERY", "Our independent business story.");
    expect(customized.aboutText).toBe("Our independent business story.");
    expect(customized.headline).toBe(defaults.headline);
  });
});

describe("website feature-request input", () => {
  it("trims meaningful text and accepts the documented maximum lengths", () => {
    expect(WebsiteFeatureRequest.parse({ title: "  New booking option  ", description: "  Explain the enhancement.  " })).toEqual({ title: "New booking option", description: "Explain the enhancement." });
    expect(WebsiteFeatureRequest.safeParse({ title: "a".repeat(100), description: "b".repeat(2000) }).success).toBe(true);
  });

  it.each([
    { title: " ", description: "Details" },
    { title: "Feature", description: " " },
    { title: "a".repeat(101), description: "Details" },
    { title: "Feature", description: "b".repeat(2001) },
    { title: "Feature", description: "Details", submittedById: "another-user" },
  ])("rejects empty, oversized, or client-owned fields: %j", input => {
    expect(WebsiteFeatureRequest.safeParse(input).success).toBe(false);
  });
});
