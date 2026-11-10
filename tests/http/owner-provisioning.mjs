/*
 * Code guide: tests/http/owner-provisioning.mjs
 * HTTP verification for owner provisioning. Connects to API_BASE_URL or localhost and checks real
 * endpoint/page responses. Fixture helpers may create synthetic accounts/businesses; use a disposable
 * development instance.
 */
// Run on a disposable instance; this creates businesses and synthetic owners.
/*
 * Import connection: node:assert/strict.
 * Strict assertions used by the HTTP smoke scripts to stop on incorrect responses or missing page content.
 */
import assert from "node:assert/strict";
/*
 * Import connection: ./provisioned-session.mjs -> tests/http/provisioned-session.mjs.
 * base: Helper/value provided by the connected module; its use in this file is shown below.
 * call: Helper/value provided by the connected module; its use in this file is shown below.
 * ownerFixture: Helper/value provided by the connected module; its use in this file is shown below.
 */
import { base, call, ownerFixture } from "./provisioned-session.mjs";

const first = await ownerFixture("first");
const second = await ownerFixture("second");
const dashboard = await fetch(base + "/", { headers: { cookie: first.developerCookie } });
assert.equal(dashboard.status, 200);
const html = await dashboard.text();
assert.ok(html.includes(first.business.name) && html.includes(second.business.name));
const form = await fetch(base + "/businesses/new", { headers: { cookie: first.developerCookie } });
const formHtml = await form.text();
for (const name of ["name", "description", "owner_email", "email", "first_name", "last_name"]) assert.ok(formHtml.includes(`name="${name}"`));
const portal = await fetch(base + "/customers", { headers: { cookie: first.cookie } });
assert.equal(portal.status, 200); assert.ok((await portal.text()).includes(first.business.name));
for (const [owner, foreign] of [[first, second], [second, first]]) {
  const list = await call("/api/Business", { cookie: owner.cookie });
  assert.deepEqual(list.body.businesses.map(b => b.id), [owner.business.id]);
  assert.equal((await call(`/api/Business/${foreign.business.id}/locations`, { cookie: owner.cookie })).status, 404);
  assert.equal((await call("/api/Business", { method: "POST", body: {}, cookie: owner.cookie })).status, 404);
}
const logout = await call("/api/auth/logout", { method: "POST", cookie: first.cookie });
assert.equal(logout.status, 200);
assert.equal((await call("/api/Business", { cookie: first.cookie })).status, 401);
console.log("PASS: existing developer dashboard and form, owner provisioning, required password replacement, business isolation, and logout replay protection.");
