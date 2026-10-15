// Local/disposable data only: this drill creates two accounts, three businesses,
// and one customer through the same HTML forms used by the browser.
import assert from "node:assert/strict";

const base = process.env.API_BASE_URL ?? "http://localhost:3000";
const suffix = Date.now().toString(36);
const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
async function signIn(username) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username }) });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}
async function page(path, cookie) {
  const response = await fetch(base + path, { headers: { cookie } });
  assert.equal(response.status, 200, path);
  return response.text();
}
async function submit(path, cookie, values) {
  const html = await page(path, cookie);
  const form = new FormData();
  for (const input of html.matchAll(/<input\b[^>]*>/g)) {
    const attrs = Object.fromEntries([...input[0].matchAll(/([\w$:-]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
    if (attrs.type === "hidden" && attrs.name) form.append(attrs.name, attrs.value ?? "");
  }
  assert.ok([...form.keys()].some(key => key.startsWith("$ACTION_")), `No form action at ${path}`);
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return fetch(base + path, { method: "POST", headers: { cookie, origin: new URL(base).origin }, body: form, redirect: "manual" });
}
async function createBusiness(name, cookie) {
  const response = await submit("/businesses/new", cookie, { name, first_name: "Local", last_name: "Owner", email: `owner-${suffix}@example.test`, phone_number: "2125550142", business_type: "OTHER" });
  assert.equal(response.status, 303, await response.text());
  const next = new URL(response.headers.get("location"), base);
  assert.equal(next.pathname, "/customers");
  const id = next.searchParams.get("businessId");
  assert.ok(id);
  assert.ok((await page(next.pathname + next.search, cookie)).includes(name));
  return id;
}
const cookie = await signIn(`business-drill-${suffix}`);
const empty = await page("/customers/new", cookie);
assert.ok(empty.includes("A business is required"));
assert.ok(empty.includes('href="/businesses/new"'));
assert.ok(!empty.includes('name="firstName"'));
const invalid = await submit("/businesses/new", cookie, { name: " ", first_name: "Local", last_name: "Owner", email: "invalid", phone_number: "1", business_type: "OTHER" });
assert.equal(invalid.status, 200);
assert.ok((await invalid.text()).includes("Name is required"));
assert.equal((await (await fetch(`${base}/api/Business`, { headers: { cookie } })).json()).businesses.length, 0);

const first = await createBusiness(`First business ${suffix}`, cookie);
const one = await page("/", cookie);
assert.ok(one.replace(/<!--[\s\S]*?-->/g, "").includes("1 total"));
assert.ok(one.includes(`/customers?businessId=${first}`));
const second = await createBusiness(`Second business ${suffix}`, cookie);
const two = await page("/", cookie);
assert.ok(two.replace(/<!--[\s\S]*?-->/g, "").includes("2 total"));
const selection = await page(`/customers/new?businessId=${first}`, cookie);
assert.ok(selection.includes(`value="${first}"`));
assert.ok(selection.includes(`value="${second}"`));

const customerValues = { businessId: second, firstName: "Linked", lastName: "Customer", email: `linked-${suffix}@example.test`, phoneNumber: "2125550166", address: "1 Example Street", preferredContactMethod: "EMAIL" };
const customer = await submit(`/customers/new?businessId=${first}`, cookie, customerValues);
assert.equal(customer.status, 303, await customer.text());
assert.equal(customer.headers.get("location"), `/customers?businessId=${second}`);
const readCustomers = async businessId => {
  const response = await fetch(`${base}/api/customers?businessId=${businessId}`, { headers: { cookie } });
  assert.equal(response.status, 200);
  return (await response.json()).data.customers;
};
assert.deepEqual(await readCustomers(first), []);
const linked = await readCustomers(second);
assert.equal(linked.length, 1);
assert.equal(linked[0].email, customerValues.email);
assert.ok((await page(`/customers/${linked[0].id}`, cookie)).includes(`Second business ${suffix}`));
const duplicate = await submit(`/customers/new?businessId=${second}`, cookie, customerValues);
assert.equal(duplicate.status, 200);
assert.ok((await duplicate.text()).includes("already exists"));
assert.equal((await readCustomers(second)).length, 1);

const otherCookie = await signIn(`other-business-drill-${suffix}`);
const foreign = await createBusiness(`Other business ${suffix}`, otherCookie);
for (const businessId of [foreign, "unknown-business"]) {
  for (const method of ["GET", "POST"]) {
    const response = await fetch(`${base}/api/customers?businessId=${businessId}`, { method, headers: { cookie, "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ ...customerValues, businessId: undefined }) } : {}) });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: { code: "NOT_FOUND", message: "Your business could not be found." } });
  }
  const response = await fetch(`${base}/customers/new?businessId=${businessId}`, { headers: { cookie } });
  const html = await response.text();
  assert.ok(response.status === 404 || html.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
  assert.ok(!html.includes(`Other business ${suffix}`));
}
const signedOut = await fetch(`${base}/businesses/new`, { redirect: "manual" });
const signedOutHtml = await signedOut.text();
assert.ok((signedOut.status === 307 && signedOut.headers.get("location") === "/login") || (signedOutHtml.includes("__next-page-redirect") && signedOutHtml.includes("url=/login")));
console.log("PASS: zero-business guidance, business form validation, owner creation, dashboard counts, customer selection and linkage, duplicate handling, tenant isolation, and signed-out access.");
