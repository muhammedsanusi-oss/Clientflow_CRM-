/*
 * Code guide: tests/http/role-login.mjs
 * HTTP verification for role login. Connects to API_BASE_URL or localhost and checks real endpoint/page
 * responses. Fixture helpers may create synthetic accounts/businesses; use a disposable development instance.
 */
// Run against a disposable local development app. Credentials are public fixtures.
/*
 * Import connection: node:assert/strict.
 * Strict assertions used by the HTTP smoke scripts to stop on incorrect responses or missing page content.
 */
import assert from "node:assert/strict";
const base = process.env.API_BASE_URL ?? "http://localhost:3000";
const password = "Clientflow-test-2026!";
const request = async (path, body, cookie) => {
  const response = await fetch(base + path, { method: body ? "POST" : "GET", redirect: "manual", signal: AbortSignal.timeout(60000),
    headers: { origin: new URL(base).origin, ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return response;
};
const cookieOf = response => response.headers.get("set-cookie")?.split(";")[0];
const page = await request("/login");
const html = await page.text();
for (const text of ["Developer", "Business owner", "Use test", "developer@clientflow.test"]) assert.ok(html.includes(text), `Login missing ${text}`);
const developer = await request("/api/auth/login", { email: "developer@clientflow.test", password, accountType: "developer" });
assert.equal(developer.status, 200); assert.equal((await developer.json()).redirectTo, "/");
const developerCookie = cookieOf(developer);
assert.equal((await request("/", undefined, developerCookie)).status, 200);
const owner = await request("/api/auth/login", { email: "owner@clientflow.test", password, accountType: "owner" });
assert.equal(owner.status, 200); assert.equal((await owner.json()).redirectTo, "/customers");
const ownerCookie = cookieOf(owner);
assert.ok((await (await request("/customers", undefined, ownerCookie)).text()).includes("Sample business"));
assert.equal((await request("/api/auth/login", { email: "owner@clientflow.test", password, accountType: "developer" })).status, 401);
const newEmail = `linked-${Date.now()}@example.test`;
const created = await request("/api/Business", {
  name: "Email linked business", description: "Created by the project developer", business_type: "OTHER", email: "contact@example.test",
  owner_email: newEmail, first_name: "Business", last_name: "Owner", phone_number: "2125550142",
}, developerCookie);
assert.equal(created.status, 201);
const handoff = (await created.json()).business;
const firstLogin = await request("/api/auth/login", { email: newEmail, password: handoff.temporaryPassword, accountType: "owner" });
assert.equal(firstLogin.status, 200); assert.equal((await firstLogin.json()).redirectTo, "/change-password");
const chosenPassword = "my new project owner password";
const activation = await request("/api/auth/change-password", { password: chosenPassword, confirmation: chosenPassword }, cookieOf(firstLogin));
assert.equal(activation.status, 200);
const activatedCookie = cookieOf(activation);
const businessList = await request("/api/Business", undefined, activatedCookie);
assert.deepEqual((await businessList.json()).businesses.map(item => item.id), [handoff.business.id]);
const portal = await request("/customers", undefined, activatedCookie);
assert.equal(portal.status, 200); assert.ok((await portal.text()).includes("Email linked business"));
console.log("PASS: browser login choices, automatic test accounts, developer dashboard, sample owner portal, role enforcement, and a newly created owner accessing only the business linked to their email.");
