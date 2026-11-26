// Disposable local app: real owner/developer pages, managed requests, and themes.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { photoBrowserSession } from "./photo-browser-session.mjs";

const base = process.env.API_BASE_URL ?? "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const browser = await photoBrowserSession(base, process.env.COLOR_BROWSER_URL ?? "http://localhost:9392");
const { send, evaluate, navigate, until } = browser;
mkdirSync("artifacts/workspace-polish", { recursive: true });
async function post(path, body, cookie) {
  const response = await fetch(base + path, { method: "POST", headers: { origin: base, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  const value = await response.json(); assert.ok(response.ok, `${path}: ${JSON.stringify(value)}`);
  return { value, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
async function session(cookie) {
  await send("Network.clearBrowserCookies");
  const split = cookie.indexOf("=");
  await send("Network.setCookie", { name: cookie.slice(0, split), value: cookie.slice(split + 1), url: base, httpOnly: true });
}
async function screen(path, name, selector = "main") {
  await navigate(path, `!!document.querySelector(${JSON.stringify(selector)})`);
  assert.equal(await evaluate("!!document.querySelector('.app-workspace')"), true);
  for (const width of [1440, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate("window.scrollTo(0,0)");
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), `Overflow: ${path} at ${width}`);
    const header = await evaluate("(() => { const r=document.querySelector('.workspace-account').getBoundingClientRect(); return {left:r.left,right:r.right,bottom:r.bottom}; })()");
    assert.ok(header.left >= 0 && header.right <= width + 1);
    const heading = await evaluate("document.querySelector('main h1')?.getBoundingClientRect().top ?? 999");
    assert.ok(heading >= header.bottom, `Account header covers heading: ${path}`);
    if (name) {
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      writeFileSync(`artifacts/workspace-polish/${name}-${width}.png`, Buffer.from(shot.data, "base64"));
    }
  }
}
try {
  const developer = (await post("/api/auth/login", { email: "developer@clientflow.test", password: "Clientflow-test-2026!", accountType: "developer" })).cookie;
  let first;
  for (const template of ["CONTACT", "BAKERY", "SALON", "BARBERSHOP"]) {
    const stamp = randomUUID(), email = `workspace-${stamp}@example.test`;
    const created = (await post("/api/Business", { name: template === "CONTACT" ? "Northside Studio" : `${template[0]}${template.slice(1).toLowerCase()} studio`, description: "A fictional business for visual verification.", first_name: "Demo", last_name: "Owner", email: `public-${stamp}@example.test`, owner_email: email, phone_number: "2125550142", business_type: template === "CONTACT" ? "OTHER" : template, website_template: template }, developer)).value.business;
    const id = created.business.id;
    const initial = await post("/api/auth/login", { email, password: created.temporaryPassword, accountType: "owner" });
    const password = `Workspace-demo-${stamp}!`;
    const owner = (await post("/api/auth/change-password", { password, confirmation: password }, initial.cookie)).cookie;
    const enrollment = (await post("/api/subscription", { businessId: id, scenario: "ENROLL", plan: "MANAGED", expectedVersion: -1 }, owner)).value.subscription;
    let subscription = (await post("/api/subscription", { businessId: id, scenario: "PAY_SUCCESS", plan: "MANAGED", expectedVersion: enrollment.version }, owner)).value.subscription;
    await session(owner);
    await screen(`/owner?businessId=${id}`, `owner-${template.toLowerCase()}`, ".owner-dashboard");
    await screen(`/managed-service?businessId=${id}`, `managed-${template.toLowerCase()}-empty`, ".managed-studio");
    assert.equal(await evaluate("document.querySelector('progress').value"), 30);
    // The actual request form remains usable after the presentation change.
    await evaluate("(() => { const form=document.querySelector('form'); const inputs=[form.querySelector('input'),form.querySelector('textarea')]; for (const [index,input] of inputs.entries()) { const proto=index?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(input,index?'Please update the existing opening hours to 9–5.':'Update opening hours'); input.dispatchEvent(new Event('input',{bubbles:true})); } })()");
    await evaluate("document.querySelector('form').requestSubmit()");
    await until("!!document.querySelector('.ms-request') && !document.querySelector('form[aria-busy=true]')");
    assert.ok(await evaluate("document.querySelector('.ms-request').textContent.includes('Update opening hours')"));
    const requestId = (await post("/api/managed-service", { action: "CREATE", businessId: id, submissionKey: randomUUID(), title: "Replace contact photo", description: "Use the supplied replacement photo in the existing section." }, owner)).value.request.id;
    await post("/api/managed-service", { action: "START", businessId: id, requestId, expectedVersion: 0 }, developer);
    await post("/api/managed-service", { action: "LOG_TIME", businessId: id, requestId, expectedVersion: 1, minutes: 12, note: "Updated existing content in the disposable demo." }, developer);
    await screen(`/managed-service?businessId=${id}`, `managed-${template.toLowerCase()}-requests`, ".ms-request");
    assert.equal(await evaluate("document.querySelector('progress').value"), 18);
    assert.ok(await evaluate("document.body.textContent.includes('18 of 30 minutes available')"));
    if (template === "CONTACT") {
      first = { id, owner, developer };
      await session(developer);
      await screen(`/businesses/${id}`, "business-overview", ".business-overview");
      await screen(`/businesses/${id}/managed-service`, "developer-managed-active", ".ms-request");
      assert.ok(await evaluate("Array.from(document.querySelectorAll('select option')).some(o=>o.textContent.includes('Complete request'))"));
      await screen(`/businesses/${id}/requests`, "business-inbox");
      subscription = (await post("/api/subscription", { businessId: id, scenario: "CANCEL", plan: "MANAGED", expectedVersion: subscription.version }, developer)).value.subscription;
      await screen(`/businesses/${id}/managed-service`, "developer-managed-inactive", ".managed-studio");
      assert.equal(await evaluate("document.querySelector('progress').value"), 0);
      assert.ok(await evaluate("document.body.textContent.includes('12 minutes') && document.body.textContent.includes('Your history remains available')"));
      await post("/api/subscription", { businessId: id, scenario: "PAY_SUCCESS", plan: "MANAGED", expectedVersion: subscription.version }, developer);
    }
    if (template === "BAKERY") {
      for (const route of ["products", "orders", "orders/settings"]) await screen(`/${route}?businessId=${id}`, `bakery-${route.replaceAll('/', '-')}`);
    }
    if (template === "BARBERSHOP") {
      for (const route of ["customers", "notes", "calendar", "calendar/locations", "calendar/services", "calendar/hours", "inquiries"]) await screen(`/${route}?businessId=${id}`, route === "customers" ? "dark-customers" : undefined);
    }
  }
  await session(first.developer);
  for (const route of ["/", "/notifications", "/custom-crm-requests", "/businesses/new", `/subscription?businessId=${first.id}`]) await screen(route, route === "/" ? "developer-dashboard" : undefined);
  await session(first.owner);
  await screen(`/businesses/${first.id}/website`, undefined, ".website-studio");
  assert.ok(await evaluate("!!document.querySelector('.photo-studio')"));
  await send("Network.clearBrowserCookies");
  await navigate(`/sites/${first.id}`, "!!document.querySelector('.business-site')");
  assert.equal(await evaluate("!!document.querySelector('.app-workspace')"), false);
  await navigate("/login", "!!document.querySelector('#email')");
  assert.equal(await evaluate("!!document.querySelector('.app-workspace')"), false);
  console.log("PASS: shared private-page styling, developer overview/inbox/dashboard, managed empty/request/active/inactive states, real request submission and 12-minute usage, all four owner themes, bakery and CRM tools at 1440px/390px, header clearance, editor preservation, and public/login isolation.");
} finally { browser.close(); }
