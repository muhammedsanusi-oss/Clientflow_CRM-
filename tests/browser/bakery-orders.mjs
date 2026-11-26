// Real local owner forms, published photo, signed-out cart/checkout, and status tracking.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { photoBrowserSession, createPhotoFixture } from "./photo-browser-session.mjs";
const base = process.env.API_BASE_URL ?? "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const browser = await photoBrowserSession(base, process.env.COLOR_BROWSER_URL ?? "http://localhost:9392");
const { send, evaluate, until, navigate, upload } = browser;
mkdirSync("tmp/product-photos", { recursive: true }); mkdirSync("artifacts/bakery-orders", { recursive: true });
const file = resolve("tmp/product-photos/bakery.png"); writeFileSync(file, createPhotoFixture());
async function post(path, body, cookie) {
  const response = await fetch(base + path, { method: "POST", headers: { origin: base, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  const result = await response.json(); assert.ok(response.ok, JSON.stringify(result)); return { response, result };
}
async function fill(label, value) {
  await evaluate(`(() => { const label = Array.from(document.querySelectorAll('label')).find(el => el.textContent.trim().startsWith(${JSON.stringify(label)})); if (!label) throw new Error('Missing label'); const el = label.querySelector('input,textarea,select'); const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(String(value))}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true})); })()`);
}
async function click(text) { await evaluate(`(() => { const button = Array.from(document.querySelectorAll('button')).find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!button || button.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)}); button.click(); })()`); }
async function shot(name, width = 390) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"));
  const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`artifacts/bakery-orders/${name}.png`, Buffer.from(image.data, "base64"));
}
try {
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 1000, deviceScaleFactor: 1, mobile: false });
  const email = `bakery-showcase-${Date.now()}@example.test`;
  const signup = await post("/api/auth/signup", { name: "Showcase Bakery", first_name: "Demo", last_name: "Baker", business_type: "BAKERY", website_template: "BAKERY", website_plan: "FREE", email, owner_email: email, phone_number: "2125550100", description: "A fictional bakery for showcase verification.", password: "Bakery-showcase-password-2026!", password_confirmation: "Bakery-showcase-password-2026!", billing_street: "100 Example Street", billing_city: "Demo City", billing_state: "NY", billing_zip: "10001" });
  const id = new URL(signup.result.redirectTo, base).searchParams.get("businessId"), cookie = signup.response.headers.get("set-cookie").split(";")[0], split = cookie.indexOf("=");
  const ownerCookie = async () => send("Network.setCookie", { name: cookie.slice(0, split), value: cookie.slice(split + 1), url: base, httpOnly: true });
  await ownerCookie();
  // Catalog management remains available even before simulated subscription payment.
  await navigate(`/owner?businessId=${id}`, "!!document.querySelector('.owner-dashboard')");
  assert.ok(await evaluate(`!!document.querySelector('a[href="/products?businessId=${id}"]')`));
  await navigate(`/businesses/${id}/website`, "!!document.querySelector('[data-photo-allowance]')");
  await upload(file); await until("document.querySelectorAll('[data-photo-section]').length === 1 && !document.querySelector('[aria-busy=true]')");
  await evaluate("document.querySelector('#website-editor-form').requestSubmit()");
  await until("document.querySelector('[data-draft-status]').textContent === 'All changes published'");
  await navigate(`/products?businessId=${id}`, "!!document.querySelector('input[name=name]')");
  for (const [label, value] of Object.entries({ "Product name": "Showcase loaf", Description: "Fresh demo bread", "Price (USD)": "5.00", "Units in stock": 3 })) await fill(label, value);
  const ref = await evaluate("document.querySelector('select[name=photoRef] option:nth-child(2)').value"); await fill("Published website photo", ref);
  await click("Save product"); await until("document.body.textContent.includes('Showcase loaf ·')");
  await shot("owner-products-390");
  await navigate(`/orders/settings?businessId=${id}`, "!!document.querySelector('input[name=speedMph]')");
  await click("Add delivery zone");
  for (const [label, value] of Object.entries({ "Zone name": "Local deliveries", "ZIP codes": "10001", "Approximate distance": 4, "Delivery fee": "3.00" })) await fill(label, value);
  await click("Save delivery settings"); await until("document.body.textContent.includes('Saved successfully.')");
  await shot("owner-delivery-390");
  await send("Network.clearBrowserCookies");
  await navigate(`/sites/${id}`, "!!document.querySelector('.business-site')");
  assert.ok(await evaluate(`!!document.querySelector('a[href="/sites/${id}/shop"]')`));
  await navigate(`/sites/${id}/shop`, "!!document.querySelector('[data-product-id] button:not([disabled])')");
  await until("Array.from(document.images).some(img => img.alt === 'Showcase loaf' && img.complete && img.naturalWidth > 0)");
  const productId = await evaluate("document.querySelector('[data-product-id]').dataset.productId");
  await click("Add Showcase loaf to cart"); await fill("Quantity for Showcase loaf", 2);
  await until("document.body.textContent.includes('Product subtotal: $10.00')");
  await send("Page.reload"); await until("!!document.querySelector('input[name=zip]') && document.querySelector('input[aria-label=\"Quantity for Showcase loaf\"]').value === '2'");
  const checkout = { "Full name": "Bakery Customer", Email: "bakery-visitor@example.test", Phone: "2125550199", "Street address": "1 Demo Street", City: "Demo City", "State (two letters)": "NY", "Delivery ZIP": "99999" };
  for (const [label, value] of Object.entries(checkout)) await fill(label, value);
  await click("Get delivery estimate"); await until("document.body.textContent.includes('Delivery is unavailable for this ZIP code.')");
  await fill("Delivery ZIP", "10001"); await click("Get delivery estimate"); await until("document.body.textContent.includes('32–47 minutes')");
  assert.ok(await evaluate("document.body.textContent.includes('$13.00')"));
  await fill("Demo payment outcome", "DECLINED"); await click("Place order with demo payment");
  await until("document.body.textContent.includes('Demo payment declined.')");
  let catalog = await (await fetch(`${base}/api/sites/${id}/shop`)).json(); assert.equal(catalog.products[0].stock, 3);
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Quantity for Showcase loaf\"]').value"), "2");
  await fill("Demo payment outcome", "SUCCESS"); await shot("public-checkout-390");
  // Submit with Enter while the payment selector is focused, exercising keyboard checkout.
  await evaluate("document.querySelector('form button[type=submit], form button:not([type])').focus()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await until("location.pathname.endsWith('/track') && document.body.textContent.includes('Demo payment successful.')");
  const token = await evaluate("location.hash.slice(1)"); assert.match(token, /^[a-f0-9]{64}$/);
  assert.ok(await evaluate("document.body.textContent.includes('Received')"));
  assert.equal(await evaluate(`localStorage.getItem('bakery-cart:${id}')`), null);
  await shot("customer-received-390");
  catalog = await (await fetch(`${base}/api/sites/${id}/shop`)).json(); assert.equal(catalog.products[0].stock, 1);
  const tracked = await fetch(`${base}/api/sites/${id}/shop`, { headers: { "x-order-token": token } });
  assert.equal(tracked.headers.get("cache-control"), "no-store"); const receipt = await tracked.json();
  assert.equal(receipt.totalCents, 1300); assert.ok(!JSON.stringify(receipt).includes("bakery-visitor@example.test"));
  const orderNumber = receipt.orderNumber; assert.match(orderNumber, /^BK-[A-F0-9]{32}$/);
  assert.equal(await evaluate("document.querySelector('input[readonly]').value.includes(location.origin)"), true);
  assert.ok(await evaluate(`document.body.textContent.includes(${JSON.stringify(orderNumber)})`));
  await navigate(`/sites/${id}`, "!!document.querySelector('.business-site')");
  assert.ok(await evaluate(`!!document.querySelector('a[href="/sites/${id}/track"]')`));
  await navigate(`/sites/${id}/track`, "!!document.querySelector('input[name=orderNumber]')");
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Your order\"]') === null"), true);
  await fill("Order number", `  ${orderNumber.toLowerCase()}  `);
  await evaluate("document.querySelector('button[type=submit]').focus()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await until("!!document.querySelector('[aria-current=step]')");
  assert.equal(await evaluate("location.hash + location.search"), "");
  assert.ok(await evaluate("document.querySelector('[aria-label=\"Your order\"]').textContent.includes('2 × Showcase loaf')"));
  await shot("customer-number-search-390");
  await fill("Order number", `BK-${"0".repeat(32)}`); await click("Check order status");
  await until("document.body.textContent.includes('No order found.')");
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Your order\"]') === null"), true);
  await fill("Order number", "BK-123"); await click("Check order status");
  await until("document.body.textContent.includes('Enter a complete order number')");
  await fill("Order number", orderNumber); await click("Check order status");
  await until("!!document.querySelector('[aria-current=step]')");
  const unauth = await fetch(`${base}/api/bakery/${id}`, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ action: "status", value: { orderId: receipt.id, version: 0, status: "WORKING_ON_IT" } }) }); assert.equal(unauth.status, 401);
  for (const [label, expected, version] of [["Working on it", "WORKING_ON_IT", 1], ["On the way for delivery", "OUT_FOR_DELIVERY", 2]]) {
    await ownerCookie(); await navigate(`/orders?businessId=${id}`, "!!document.querySelector('article.shop-card button')");
    assert.ok(await evaluate("document.body.textContent.includes('bakery-visitor@example.test')"));
    await click(`Mark ${label}`); await until(`document.body.textContent.includes('Saved successfully.') && document.querySelector('article.shop-card strong').textContent === ${JSON.stringify(label)}`);
    if (version === 2) await shot("owner-out-for-delivery-1440", 1440);
    await send("Network.clearBrowserCookies"); await navigate(`/sites/${id}/track`, "!!document.querySelector('input[name=orderNumber]')");
    await fill("Order number", orderNumber); await click("Check order status");
    await until("!!document.querySelector('[aria-current=step]')");
    await click("Refresh order status"); await until(`document.querySelector('[aria-current=step]').textContent.startsWith(${JSON.stringify(label)})`);
    const updated = await (await fetch(`${base}/api/sites/${id}/shop`, { headers: { "x-order-token": token } })).json(); assert.equal(updated.status, expected); assert.equal(updated.events.length, version + 1);
  }
  await shot("customer-out-for-delivery-390");
  // The final unit becomes sold out and cannot be added again.
  await navigate(`/sites/${id}/shop`, "!!document.querySelector('[data-product-id] button:not([disabled])')"); await click("Add Showcase loaf to cart");
  await ownerCookie(); await post(`/api/bakery/${id}`, { action: "product", value: { id: productId, name: "Showcase loaf", description: "Fresh demo bread", priceCents: 500, stock: 0, active: true, displayOrder: 0, photoRef: ref } }, cookie);
  await send("Network.clearBrowserCookies"); await click("Refresh products"); await until("document.body.textContent.includes('Sold out')");
  assert.ok(await evaluate("document.querySelector('[data-product-id] button').disabled"));
  assert.ok(await evaluate("document.body.textContent.includes('Some items are no longer available')"));
  console.log("PASS: owner forms on pending Standard subscription, real published product photo rendering, delivery ZIP settings, cart reload, unsupported ZIP, $13 / 32–47 minute estimate, declined/successful demo checkout, owner-only status changes, private tracking, mobile/desktop layout, keyboard checkout, and sold-out feedback.");
} finally { browser.close(); }
