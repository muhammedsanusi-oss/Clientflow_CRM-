// Disposable local instance + Azurite; exercises admin links and actual publication.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { photoBrowserSession, createPhotoFixture } from "./photo-browser-session.mjs";

const base = process.env.API_BASE_URL ?? "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const browser = await photoBrowserSession(base, process.env.COLOR_BROWSER_URL ?? "http://localhost:9392");
const { send, evaluate, until, navigate, upload } = browser;
mkdirSync("tmp/product-photos", { recursive: true }); mkdirSync("artifacts/owner-website-editing", { recursive: true });
const photo = resolve("tmp/product-photos/owner-access.png");
writeFileSync(photo, createPhotoFixture());
async function post(path, body, cookie) {
  const response = await fetch(base + path, { method: "POST", headers: { origin: base, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  const result = await response.json(); assert.ok(response.ok, JSON.stringify(result)); return { response, result };
}
async function screenshot(name) {
  await evaluate("window.scrollTo(0,0)");
  assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"));
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`artifacts/owner-website-editing/${name}.png`, Buffer.from(result.data, "base64"));
}
try {
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 1000, deviceScaleFactor: 1, mobile: false });
  for (const [plan, tier, limit] of [["STANDARD", "FREE", 10], ["CRM", "PLUS", 20], ["MANAGED", "PREMIUM", 50]]) {
    const email = `owner-edit-${plan.toLowerCase()}-${Date.now()}@example.test`;
    const signup = await post("/api/auth/signup", {
      name: `${plan} owner editing`, first_name: "Demo", last_name: "Owner", business_type: "BARBERSHOP", website_template: "BARBERSHOP", website_plan: tier,
      email, owner_email: email, phone_number: "2125550100", description: "A fictional business for owner editing checks.",
      password: "Owner-edit-demo-password-2026!", password_confirmation: "Owner-edit-demo-password-2026!",
      billing_street: "100 Example Street", billing_city: "Example City", billing_state: "NY", billing_zip: "10001",
    });
    const id = new URL(signup.result.redirectTo, base).searchParams.get("businessId");
    const cookie = signup.response.headers.get("set-cookie").split(";")[0], separator = cookie.indexOf("=");
    await send("Network.setCookie", { name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: base, httpOnly: true });
    let version = 0;
    for (const [state, scenario] of [["PENDING", null], ["ACTIVE", "PAY_SUCCESS"], ["PAST_DUE", "PAY_FAILURE"], ["CANCELED", "CANCEL"]]) {
      if (scenario) version = (await post("/api/subscription", { businessId: id, plan, scenario, expectedVersion: version }, cookie)).result.subscription.version;
      const editor = `/businesses/${id}/website`;
      await navigate(`/owner?businessId=${id}`, "!!document.querySelector('.owner-dashboard')");
      assert.ok(await evaluate(`!!document.querySelector('a[href="${editor}"]')`), `${plan}/${state}: missing dashboard editing link`);
      assert.equal(await evaluate("document.body.textContent.includes('Editing and inquiries become available')"), false);
      if (state === "CANCELED") await screenshot(`${plan.toLowerCase()}-canceled-dashboard-390`);
      await evaluate(`document.querySelector('a[href="${editor}"]').click()`);
      await until(`location.pathname === '${editor}' && !!document.querySelector('[data-photo-allowance]')`);
      assert.ok(await evaluate(`document.querySelector('[data-photo-allowance]').textContent.includes('of ${limit}')`));
      if (state === "PENDING") {
        await upload(photo);
        await until("document.querySelectorAll('[data-photo-section]').length === 1 && !document.querySelector('[aria-busy=true]')");
      }
      const headline = `${plan} website published while ${state}`;
      await evaluate("document.querySelector('[aria-label=\"Edit hero section\"]').click()");
      await until("!!document.querySelector('[data-rich-field=headline][contenteditable=true]')");
      await evaluate(`(() => { const el = document.querySelector('[data-rich-field=headline]'); el.focus(); el.textContent = ${JSON.stringify(headline)}; el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${JSON.stringify(headline)} })); })()`);
      await evaluate("document.querySelector('#website-editor-form').requestSubmit()");
      await until("document.querySelector('[data-draft-status]').textContent === 'All changes published'");
      await navigate(`/website?businessId=${id}`, "!!document.querySelector('section[aria-label=\"Published website preview\"]')");
      assert.ok(await evaluate(`!!document.querySelector('a[href="${editor}"]')`), `${plan}/${state}: missing preview editing link`);
      assert.ok(await evaluate(`document.body.textContent.includes(${JSON.stringify(headline)})`));
      const publicPage = await fetch(`${base}/sites/${id}`);
      assert.equal(publicPage.status, 200); assert.ok((await publicPage.text()).includes(headline));
      assert.equal((await fetch(`${base}/api/sites/${id}/image/offerings-0`)).status, 200);
      const crm = await fetch(`${base}/api/Business/${id}/customers`, { headers: { cookie } });
      assert.equal(crm.status, state === "ACTIVE" && plan !== "STANDARD" ? 200 : 404);
    }
  }
  console.log("PASS: actual owner dashboard and preview links, photo upload before checkout, editing and public publication on Standard/CRM/Managed in pending, active, past-due and canceled states; image limits and paid CRM boundaries remain enforced.");
} finally { browser.close(); }
