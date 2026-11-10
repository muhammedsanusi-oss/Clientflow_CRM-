/*
 * Code guide: tests/http/provisioned-session.mjs
 * HTTP verification for provisioned session. Connects to API_BASE_URL or localhost and checks real
 * endpoint/page responses. Fixture helpers may create synthetic accounts/businesses; use a disposable
 * development instance.
 */
/*
 * Import connection: node:assert/strict.
 * Strict assertions used by the HTTP smoke scripts to stop on incorrect responses or missing page content.
 */
import assert from "node:assert/strict";
export const base = process.env.API_BASE_URL ?? "http://localhost:3000";
const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let developerCookie;
export async function call(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(base + path, {
    method, redirect: "manual", signal: AbortSignal.timeout(60000),
    headers: { origin: new URL(base).origin, ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
export async function developerSession() {
  if (developerCookie) return developerCookie;
  const email = process.env.DEVELOPER_EMAIL;
  const password = process.env.DEVELOPER_PASSWORD;
  assert.ok(email && password, "Set DEVELOPER_EMAIL and DEVELOPER_PASSWORD for an explicitly provisioned developer on a disposable app.");
  const result = await call("/api/auth/login", { method: "POST", body: { email, password } });
  assert.equal(result.status, 200, "Developer login failed");
  assert.equal(result.body.redirectTo, "/");
  developerCookie = result.cookie;
  return developerCookie;
}
export async function ownerFixture(label) {
  const email = `${label}-${nonce}@example.test`;
  const developer = await developerSession();
  const created = await call("/api/Business", { method: "POST", cookie: developer, body: {
    name: `Drill ${label}`, description: "Disposable business for verification", owner_email: email,
    email, first_name: "Test", last_name: "Owner", phone_number: "2125550142", business_type: "OTHER",
  } });
  assert.equal(created.status, 201, "Provisioning failed");
  const { business, temporaryPassword } = created.body.business;
  const first = await call("/api/auth/login", { method: "POST", body: { email, password: temporaryPassword } });
  assert.equal(first.status, 200); assert.equal(first.body.redirectTo, "/change-password");
  assert.equal((await call("/api/Business", { cookie: first.cookie })).status, 401);
  const password = `owner password for ${label} ${nonce}`;
  const changed = await call("/api/auth/change-password", { method: "POST", cookie: first.cookie, body: { password, confirmation: password } });
  assert.equal(changed.status, 200);
  assert.notEqual(changed.cookie, first.cookie);
  assert.equal((await call("/api/auth/login", { method: "POST", body: { email, password: temporaryPassword } })).status, 401);
  return { cookie: changed.cookie, business, email, password, developerCookie: developer };
}
