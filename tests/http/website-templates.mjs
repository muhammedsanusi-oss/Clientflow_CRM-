// Creates synthetic template demos on a disposable local development app.
import assert from "node:assert/strict";
const base = process.env.API_BASE_URL ?? "http://localhost:3000";
const demoPassword = "Template-owner-2026!";
const nonce = Date.now().toString(36);
const cookieOf = response => response.headers.get("set-cookie")?.split(";")[0];
async function json(path, body, cookie) {
  const response = await fetch(base + path, { method: body ? "POST" : "GET", redirect: "manual", signal: AbortSignal.timeout(60000),
    headers: { origin: new URL(base).origin, ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, body: await response.json() };
}
const developer = await json("/api/auth/login", { email: "developer@clientflow.test", password: "Clientflow-test-2026!", accountType: "developer" });
assert.equal(developer.response.status, 200, "Local test developer login failed");
const developerCookie = cookieOf(developer.response);
const formResponse = await fetch(base + "/businesses/new", { headers: { cookie: developerCookie }, signal: AbortSignal.timeout(60000) });
assert.equal(formResponse.status, 200);
const form = await formResponse.text();
for (const text of ["Bakery", "Barbershop", "Salon", "Contact", "Preview template", "Use sample details"]) assert.ok(form.includes(text), `Missing template control: ${text}`);
const cases = [
  { key: "BAKERY", type: "BAKERY", name: "Golden Crumb Bakery", heading: "fresh from the oven" },
  { key: "BARBERSHOP", type: "BARBERSHOP", name: "The Corner Chair", heading: "Sharp cuts." },
  { key: "SALON", type: "SALON", name: "Bloom & Co. Salon", heading: "Beautifully." },
  { key: "CONTACT", type: "OTHER", name: "Northside Studio", heading: "Let&#x27;s talk." },
];
const demos = [];
for (const item of cases) {
  const ownerEmail = `${item.key.toLowerCase()}-demo-${nonce}@example.test`;
  const created = await json("/api/Business", {
    name: item.name, business_type: item.type, website_template: item.key, description: `A friendly ${item.key.toLowerCase()} business, created to test its reusable website.`,
    email: `${item.key.toLowerCase()}@public.example`, phone_number: "2125550142", first_name: "Test", last_name: "Owner", owner_email: ownerEmail,
    public_address: "123 Example Street", opening_hours: "Monday-Friday, 9am-5pm",
  }, developerCookie);
  assert.equal(created.response.status, 201, `Failed to create ${item.key}`);
  const handoff = created.body.business;
  const id = handoff.business.id;
  const response = await fetch(`${base}/sites/${id}`, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(`site-theme-${item.key.toLowerCase()}`));
  assert.ok(html.includes(item.heading), `Wrong ${item.key} design`);
  assert.ok(html.includes("123 Example Street")); assert.ok(html.includes("Monday-Friday, 9am-5pm"));
  assert.ok(!html.includes(ownerEmail)); assert.ok(!html.includes(handoff.temporaryPassword));
  const sent = await json(`/api/sites/${id}/contact`, { name: "Demo visitor", email: "visitor@example.test", phone: "2125550199", message: `Hello ${item.name}, this is a contact-form test.`, website: "" });
  assert.equal(sent.response.status, 200);
  const first = await json("/api/auth/login", { email: ownerEmail, password: handoff.temporaryPassword, accountType: "owner" });
  assert.equal(first.response.status, 200); assert.equal(first.body.redirectTo, "/change-password");
  const restricted = cookieOf(first.response);
  const denied = await fetch(`${base}/inquiries?businessId=${id}`, { headers: { cookie: restricted }, redirect: "manual" });
  assert.equal(denied.status, 307);
  const active = await json("/api/auth/change-password", { password: demoPassword, confirmation: demoPassword }, restricted);
  assert.equal(active.response.status, 200);
  const ownerCookie = cookieOf(active.response);
  const inbox = await fetch(`${base}/inquiries?businessId=${id}`, { headers: { cookie: ownerCookie }, signal: AbortSignal.timeout(60000) });
  assert.equal(inbox.status, 200); assert.ok((await inbox.text()).includes(`Hello ${item.name.replaceAll("&", "&amp;")}`));
  const memberships = await json("/api/Business", undefined, ownerCookie);
  assert.deepEqual(memberships.body.businesses.map(b => b.id), [id]);
  demos.push({ template: item.key, name: item.name, ownerEmail, websiteUrl: `${base}/sites/${id}`, ownerCookie, id });
}
for (const [first,second] of [[demos[0],demos[1]],[demos[1],demos[0]]]) {
  const foreign = await fetch(`${base}/inquiries?businessId=${first.id}`, { headers: { cookie: second.ownerCookie }, signal: AbortSignal.timeout(60000) });
  const html = await foreign.text();
  assert.ok(foreign.status === 404 || html.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
  assert.ok(!html.includes("Demo visitor"));
}
console.log("PASS: all four template websites, developer controls, public/private field separation, contact delivery, owner activation and isolated inboxes.");
console.log(JSON.stringify({ demoOwnerPassword: demoPassword, demos: demos.map(({ownerCookie,id,...demo}) => demo) }, null, 2));
