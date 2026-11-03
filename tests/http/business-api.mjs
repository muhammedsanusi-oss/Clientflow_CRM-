import assert from "node:assert/strict";
import { sessionCookie } from "./session-cookies.mjs";

// Run against disposable data with two real GitHub sessions; creates CRM rows.
const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";
const nonce = Date.now().toString(36);
async function call(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

const businessInput = { name: "HTTP drill", first_name: "Ada", last_name: "Owner", email: `owner-${nonce}@example.com`, phone_number: "1234567890", business_type: "SPA" };
const locationInput = { name: "Main", phone_number: "1234567890", email: `location-${nonce}@example.com`, address: "123 Main Street" };
const employeeInput = { firstName: "Grace", lastName: "Staff", email: `staff-${nonce}@example.com`, phone_number: "1234567890", role: "STAFF" };
assert.equal((await call("/api/health")).status, 200);
assert.equal((await call("/api/Business")).status, 401);
const first = { cookie: sessionCookie("A") };
const second = { cookie: sessionCookie("B") };
const firstBusiness = await call("/api/Business", { method: "POST", body: businessInput, cookie: first.cookie });
const secondBusiness = await call("/api/Business", { method: "POST", body: businessInput, cookie: second.cookie });
assert.equal(firstBusiness.status, 201, JSON.stringify(firstBusiness.body));
assert.equal(secondBusiness.status, 201, JSON.stringify(secondBusiness.body));
const firstId = firstBusiness.body.business.business.id;
const secondId = secondBusiness.body.business.business.id;
for (const [id, cookie] of [[firstId, second.cookie], [secondId, first.cookie]]) {
  for (const result of [
    await call(`/api/Business/${id}/locations`, { cookie }),
    await call(`/api/Business/${id}/locations`, { method: "POST", body: locationInput, cookie }),
    await call(`/api/Business/${id}/employees`, { method: "POST", body: employeeInput, cookie }),
  ]) {
    assert.equal(result.status, 404);
    assert.equal(result.body.error.code, "NOT_FOUND");
  }
}
const locationPath = `/api/Business/${firstId}/locations`;
assert.equal((await call(locationPath, { method: "POST", body: locationInput, cookie: first.cookie })).status, 201);
assert.equal((await call(locationPath, { method: "POST", body: locationInput, cookie: first.cookie })).status, 409);
assert.equal((await call(locationPath, { cookie: first.cookie })).body.locations.length, 1);
const employeePath = `/api/Business/${firstId}/employees`;
const employee = await call(employeePath, { method: "POST", body: employeeInput, cookie: first.cookie });
assert.equal(employee.status, 201, JSON.stringify(employee.body));
const session = await call("/api/auth/session", { cookie: first.cookie });
assert.notEqual(employee.body.employee.user_id, session.body.user.id);
assert.equal((await call(employeePath, { method: "POST", body: employeeInput, cookie: first.cookie })).status, 409);
assert.equal((await call("/api/Business", { method: "POST", body: {}, cookie: first.cookie })).status, 400);
console.log("HTTP drill passed: authenticated tenant isolation, locations, employees, duplicates and validation. Manual OAuth and logout proofs remain separate.");
