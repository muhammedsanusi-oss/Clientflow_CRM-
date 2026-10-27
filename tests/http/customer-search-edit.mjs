// Run against a disposable local app: creates isolated demo accounts and rows.
import assert from "node:assert/strict";

const base = process.env.API_BASE_URL ?? "http://localhost:3000";
const suffix = Date.now().toString(36);
const request = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(60_000) });
const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
async function signIn(username) {
  const response = await request(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username }) });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}
async function json(path, cookie, body) {
  const response = await request(base + path, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(response.status, 201, await response.clone().text());
  return response.json();
}
async function page(path, cookie) {
  const response = await request(base + path, { headers: { cookie } });
  assert.equal(response.status, 200, path);
  return response.text();
}
async function submit(path, cookie, values) {
  const html = await page(path, cookie);
  const data = new FormData();
  for (const input of html.matchAll(/<input\b[^>]*>/g)) {
    const attrs = Object.fromEntries([...input[0].matchAll(/([\w$:-]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
    if (attrs.type === "hidden" && attrs.name) data.append(attrs.name, attrs.value ?? "");
  }
  assert.ok([...data.keys()].some(key => key.startsWith("$ACTION_")), "Missing server form action");
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return request(base + path, { method: "POST", headers: { cookie, origin: new URL(base).origin }, body: data, redirect: "manual" });
}
const cookie = await signIn(`search-edit-${suffix}`);
const otherCookie = await signIn(`search-other-${suffix}`);
const businessInput = { name: "Search/edit drill", first_name: "Test", last_name: "Owner", email: `${suffix}@example.test`, phone_number: "2125550123", business_type: "OTHER" };
const business = (await json("/api/Business", cookie, businessInput)).business.business;
const other = (await json("/api/Business", otherCookie, businessInput)).business.business;
const values = { firstName: "Maria", lastName: "Lopez", email: "maria@example.test", phoneNumber: "555-1234", address: "10 Main St", preferredContactMethod: "EMAIL" };
const created = (await json(`/api/customers?businessId=${business.id}`, cookie, values)).data.customer;
await json(`/api/customers?businessId=${business.id}`, cookie, { ...values, firstName: "Aaron", email: "aaron@example.test", phoneNumber: "555-9999" });
const foreign = (await json(`/api/customers?businessId=${other.id}`, otherCookie, values)).data.customer;
for (const query of ["MARIA", "Maria Lopez", "1234", "maria@example"]) {
  const html = await page(`/customers?businessId=${business.id}&q=${encodeURIComponent(query)}`, cookie);
  assert.ok(html.includes(`/customers/${created.id}`));
  assert.ok(!html.includes(`/customers/${foreign.id}`));
  assert.ok(!html.includes("aaron@example.test"));
}
assert.ok((await page(`/customers?businessId=${business.id}&q=nobody`, cookie)).includes("No customers match your search"));
for (const query of ["q=one&q=two", `q=${"x".repeat(101)}`]) assert.ok((await page(`/customers?businessId=${business.id}&${query}`, cookie)).includes("Enter one search query"));
const path = `/customers/${created.id}/edit`;
const edit = await page(path, cookie);
assert.ok(edit.includes('value="Maria"'));
assert.ok(edit.includes(`href="/customers/${created.id}"`));
assert.ok(!edit.includes('name="businessId"'));
const invalid = await submit(path, cookie, { ...values, email: "invalid" });
assert.equal(invalid.status, 200);
assert.ok((await invalid.text()).includes("Enter a valid email"));
const duplicate = await submit(path, cookie, { ...values, email: "aaron@example.test" });
assert.equal(duplicate.status, 200);
const duplicateHtml = await duplicate.text();
assert.ok(duplicateHtml.includes("already exists"));
assert.ok(duplicateHtml.includes('value="aaron@example.test"'));
const saved = await submit(path, cookie, { ...values, firstName: "Marie", phoneNumber: "555-5678" });
assert.equal(saved.status, 303, await saved.text());
assert.equal(saved.headers.get("location"), `/customers/${created.id}`);
assert.ok((await page(`/customers/${created.id}`, cookie)).includes("555-5678"));
assert.ok((await page(`/customers?businessId=${business.id}&q=Marie`, cookie)).includes("555-5678"));
assert.ok(!(await page(`/customers?businessId=${business.id}&q=1234`, cookie)).includes(`/customers/${created.id}`));
for (const id of [foreign.id, "unknown-customer"]) {
  const response = await request(`${base}/customers/${id}/edit`, { headers: { cookie } });
  const html = await response.text();
  assert.ok(response.status === 404 || html.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
  assert.ok(!html.includes('value="Maria"'));
}
for (const route of ["/customers", path]) {
  const response = await request(base + route, { redirect: "manual" });
  const html = await response.text();
  assert.ok((response.status === 307 && response.headers.get("location") === "/login") || (html.includes("__next-page-redirect") && html.includes("url=/login")));
}
console.log("PASS: scoped search, invalid query handling, prefilled edit forms, field errors, retained inputs, duplicate conflicts, saved profile/list updates, foreign/unknown customers, and signed-out redirects.");
