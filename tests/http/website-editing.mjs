/*
 * Code guide: tests/http/website-editing.mjs
 * HTTP verification for website editing. Connects to API_BASE_URL or localhost and checks real endpoint/page
 * responses. Fixture helpers may create synthetic accounts/businesses; use a disposable development instance.
 */
// Uses synthetic accounts and the compiled Next action on a disposable local app.
/*
 * Import connection: node:assert/strict.
 * Strict assertions used by the HTTP smoke scripts to stop on incorrect responses or missing page content.
 */
import assert from "node:assert/strict";
/*
 * Import connection: node:fs/promises.
 * Promise-based local filesystem access, primarily reading migration files or a local compiled action
 * manifest in these modules.
 */
import { readFile } from "node:fs/promises";
/*
 * Import connection: ./provisioned-session.mjs -> tests/http/provisioned-session.mjs.
 * base: Helper/value provided by the connected module; its use in this file is shown below.
 * ownerFixture: Helper/value provided by the connected module; its use in this file is shown below.
 */
import { base, ownerFixture } from "./provisioned-session.mjs";

const first = await ownerFixture("website-editor");
const second = await ownerFixture("website-isolation");
const id = first.business.id;
const editorPath = `/businesses/${id}/website`;
async function page(path, cookie) {
  const response = await fetch(base + path, { headers: cookie ? { cookie } : {}, redirect: "manual", signal: AbortSignal.timeout(60000) });
  return { response, html: await response.text() };
}
const editor = await page(editorPath, first.developerCookie);
assert.equal(editor.response.status, 200);
assert.ok(editor.html.includes("Save and publish"));
assert.ok(editor.html.includes("Live website preview"));
assert.ok((await page("/", first.developerCookie)).html.includes("Edit website"));

// Resolve the local compiled action by its owning page rather than hardcoding a build ID.
const manifest = JSON.parse(await readFile(new URL("../../apps/web/.next/server/server-reference-manifest.json", import.meta.url), "utf8"));
const entries = Object.entries(manifest.node).filter(([, value]) =>
  Object.keys(value.workers).some(worker => worker.endsWith("/businesses/[id]/website/page")));
assert.equal(entries.length, 1, "Expected only the website publish action on this page");
const actionId = entries[0][0];
const input = {
  version: 0, name: "Published website drill", description: "A website updated through its real publish action.",
  websiteTemplate: "CONTACT", email: "public-edits@example.test", phone_number: "2125550142",
  publicAddress: "Updated address", openingHours: "Monday-Saturday, 9am-6pm",
  eyebrow: "A personal welcome", headline: "Published changes reach the owner",
  sectionTitle: "Our updated story", buttonLabel: "Ask us a question",
  aboutText: "A separate about section description.",
  features: ["Personal attention"], offerings: ["Consultations"],
  fontFamily: "SANS", textColor: "INK", textScale: "STANDARD",
  sectionImages: { header: [], hero: [], features: [], about: [], offerings: [], contact: [] },
  additionalSections: [], logoImage: "", heroImage: "",
};
async function publish(values, cookie, origin = new URL(base).origin, businessId = id) {
  const response = await fetch(base + editorPath, {
    method: "POST", redirect: "manual", signal: AbortSignal.timeout(60000),
    headers: { cookie, origin, "next-action": actionId, "content-type": "text/plain;charset=UTF-8", accept: "text/x-component" },
    body: JSON.stringify([businessId, values]),
  });
  return { response, body: await response.text() };
}
const before = await page(`/sites/${id}`);
assert.ok(!before.html.includes(input.headline), "Unsaved changes must stay private");
const saved = await publish(input, first.developerCookie);
assert.equal(saved.response.status, 200);
assert.ok(saved.body.includes('"version":1'), "Publish action must return the saved version");
const live = await page(`/sites/${id}`);
assert.ok(live.html.includes(input.headline));
assert.ok(live.html.includes("Monday-Saturday, 9am-6pm"));
assert.ok(!live.html.includes(first.email));
const owner = await page(`/website?businessId=${id}`, first.cookie);
assert.equal(owner.response.status, 200);
assert.ok(owner.html.includes(input.headline));
assert.ok(owner.html.includes("Last published"));
assert.ok(owner.html.includes("Edit website"));
assert.ok(owner.html.includes("Customize your website"));
assert.ok((await page(`/customers?businessId=${id}`, first.cookie)).html.includes(`/website?businessId=${id}`));
const ownerPublish = await publish({ ...input, version: 1, headline: "Owner update" }, first.cookie);
assert.ok(ownerPublish.body.includes('"version":2'));
assert.ok((await page(`/sites/${id}`)).html.includes("Owner update"));
const stale = await publish({ ...input, headline: "Stale overwrite" }, first.developerCookie);
assert.ok(stale.body.includes("CONFLICT"));
assert.ok(!(await page(`/sites/${id}`)).html.includes("Stale overwrite"));
const badOrigin = await publish({ ...input, version: 1 }, first.developerCookie, "https://foreign.example");
assert.ok(badOrigin.response.status >= 400 || badOrigin.body.includes("Invalid Server Actions request"));
const foreign = await page(`/website?businessId=${id}`, second.cookie);
assert.ok(foreign.response.status === 404 || foreign.html.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
assert.ok(!(await page(`/sites/${second.business.id}`)).html.includes(input.headline));
for (const path of [editorPath, `/website?businessId=${id}`]) {
  const signedOut = await page(path);
  // Loading boundaries can stream a 200 shell before Next emits the redirect.
  assert.ok(signedOut.response.status === 307 || signedOut.html.includes("url=/login") || signedOut.html.includes("NEXT_REDIRECT;replace;/login"));
  assert.ok(!signedOut.html.includes("Save and publish"));
  assert.ok(!signedOut.html.includes(input.headline));
}
const escaped = await publish({ ...input, version: 2, headline: '<script>alert("demo")</script>' }, first.developerCookie);
assert.ok(escaped.body.includes('"version":3'));
const escapedPage = await page(`/sites/${id}`);
assert.ok(escapedPage.html.includes("&lt;script&gt;"));
assert.ok(!escapedPage.html.includes('<script>alert("demo")</script>'));
console.log("PASS: real website publication, owner visibility, revision conflicts, escaped text, same-origin enforcement, and business isolation.");
