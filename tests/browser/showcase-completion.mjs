// Run against a disposable development instance and isolated headless Chrome.
// API_BASE_URL=http://localhost:3100 COLOR_BROWSER_URL=http://localhost:9392
// pnpm exec node tests/browser/showcase-completion.mjs
// Creates fictional data only; never point this drill at a shared database.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";

const base = process.env.API_BASE_URL ?? "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a disposable local instance.");
const browser = process.env.COLOR_BROWSER_URL ?? "http://localhost:9392";
const targets = await (await fetch(`${browser}/json/list`)).json();
const target = targets.find(page => page.type === "page" && (page.url === "about:blank" || page.url.startsWith(base)));
assert.ok(target, "Open an isolated browser tab first.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map(), dialogs = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method === "Page.javascriptDialogOpening") {
    dialogs.push(message.params);
    void send("Page.handleJavaScriptDialog", { accept: false });
  }
  const item = pending.get(message.id);
  if (item) { pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result); }
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try { if (await evaluate(expression)) return; } catch { /* navigation replaces the execution context */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function navigate(path, ready) {
  await send("Page.navigate", { url: base + path });
  await until(`location.pathname === ${JSON.stringify(path.split("?")[0])} && document.readyState === 'complete' && (${ready})`);
}
async function fill(name, value) {
  await evaluate(`(() => {
    const el = document.querySelector(':is(input, select, textarea)[name=${JSON.stringify(name)}]');
    if (!el) throw new Error('Missing field: ' + ${JSON.stringify(name)});
    const prototype = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, ${JSON.stringify(String(value))});
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
}
async function key(key, code, windowsVirtualKeyCode, text) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode, ...(text ? { text } : {}) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode });
}
async function tabTo(selector) {
  for (let index = 0; index < 60; index++) {
    if (await evaluate(`document.activeElement?.matches(${JSON.stringify(selector)})`)) return;
    await key("Tab", "Tab", 9);
  }
  throw new Error(`Keyboard could not reach ${selector}`);
}
async function keyboardFill(name, value) {
  await tabTo(`input[name="${name}"]`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
  await send("Input.insertText", { text: value });
}
async function call(path, body, cookie) {
  const response = await fetch(base + path, { method: "POST", headers: { origin: base, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  const result = await response.json();
  assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(result)}`);
  return { response, result };
}
async function screenshot(name, width = 390) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `Horizontal overflow: ${name}`);
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`artifacts/showcase-completion/${name}.png`, Buffer.from(result.data, "base64"));
}

try {
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable"); await send("Network.clearBrowserCookies");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  mkdirSync("artifacts/showcase-completion", { recursive: true });
  const stamp = Date.now();
  const signup = await call("/api/auth/signup", {
    name: `Showcase Salon ${stamp}`, first_name: "Demo", last_name: "Owner", business_type: "SALON",
    email: `salon-${stamp}@example.test`, owner_email: `owner-${stamp}@example.test`, phone_number: "2125550100",
    password: "Showcase-example-password-2026!", password_confirmation: "Showcase-example-password-2026!",
    description: "A fictional salon for the Clientflow showcase.", website_template: "SALON", website_plan: "PLUS",
    billing_street: "100 Example Street", billing_city: "Example City", billing_state: "NY", billing_zip: "10001",
  });
  const businessId = new URL(signup.result.redirectTo, base).searchParams.get("businessId");
  assert.ok(businessId);
  const cookie = signup.response.headers.get("set-cookie").split(";")[0];
  const separator = cookie.indexOf("=");
  const setOwnerCookie = () => send("Network.setCookie", { name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: base, httpOnly: true });
  await setOwnerCookie();
  let subscription = (await call("/api/subscription", { businessId, scenario: "PAY_SUCCESS", plan: "CRM", expectedVersion: 0 }, cookie)).result.subscription;
  const query = `?businessId=${businessId}`;
  await navigate(`/sites/${businessId}`, "!!document.querySelector('.business-site')");
  assert.equal(await evaluate(`!!document.querySelector('a[href="/book/${businessId}"]')`), false);

  await navigate(`/calendar/locations${query}`, "!!document.querySelector('input[name=name]')");
  assert.ok(await evaluate("document.body.innerText.includes('Finish your booking setup')"));
  for (const [name, value] of Object.entries({ name: "Showcase studio", address: "100 Example Street" })) await keyboardFill(name, value);
  await tabTo("form:has(input[name=name]) button"); await key("Enter", "Enter", 13, "\r");
  await until("document.body.innerText.includes('Location added.')");
  for (const [name, value] of Object.entries({ name: "Showcase studio", address: "100 Example Street" })) await fill(name, value);
  await evaluate("document.querySelector('input[name=name]').form.requestSubmit()");
  await until("document.body.innerText.includes('A location with that name or address already exists')");
  assert.equal(await evaluate("document.querySelector('input[name=name]').value"), "Showcase studio");
  await screenshot("locations-390");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", windowsVirtualKeyCode: 9 });

  await navigate(`/calendar/services${query}`, "!!document.querySelector('input[name=durationMinutes]')");
  await fill("name", "Showcase haircut"); await fill("durationMinutes", "30"); await fill("description", "A fictional service.");
  await evaluate("document.querySelector('input[name=name]').form.requestSubmit()");
  await until("document.querySelectorAll('input[name=serviceId]').length > 0");
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  await navigate(`/calendar/hours${query}`, "!!document.querySelector('input[name=startTime]')");
  await fill("dayOfWeek", day); await fill("startTime", "09:00"); await fill("endTime", "17:00");
  await evaluate("document.querySelector('input[name=startTime]').form.requestSubmit()");
  await until("document.querySelectorAll('input[name=intervalId]').length > 0");
  await navigate(`/calendar${query}`, "document.body.innerText.includes('Online booking is configured')");
  await screenshot("booking-setup-390");

  // Website publication remains available after a failed simulated payment.
  await navigate(`/businesses/${businessId}/website`, "!!document.querySelector('[data-draft-status]')");
  assert.equal(await evaluate("document.querySelector('[data-draft-status]').textContent"), "All changes published");
  await evaluate("document.querySelector('[aria-label=\"Edit hero section\"]').click()");
  await until("!!document.querySelector('[data-rich-field=headline][contenteditable=true]')");
  await evaluate("(() => { const el = document.querySelector('[data-rich-field=headline]'); el.focus(); el.textContent = 'Your showcase starts here'; el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'Your showcase starts here' })); })()");
  await until("document.querySelector('[data-draft-status]').textContent === 'Unpublished changes'");
  assert.equal(await evaluate("window.dispatchEvent(new Event('beforeunload', { cancelable: true }))"), false);
  await evaluate(`document.querySelector('a[href="/website${query}"]').click()`);
  assert.ok(dialogs.some(dialog => dialog.message.includes("unpublished website changes")));
  assert.equal(await evaluate("location.pathname"), `/businesses/${businessId}/website`);
  subscription = (await call("/api/subscription", { businessId, scenario: "PAY_FAILURE", plan: "CRM", expectedVersion: subscription.version }, cookie)).result.subscription;
  await evaluate("document.querySelector('#website-editor-form').requestSubmit()");
  await until("document.querySelector('[data-draft-status]').textContent === 'All changes published'");
  subscription = (await call("/api/subscription", { businessId, scenario: "PAY_SUCCESS", plan: "CRM", expectedVersion: subscription.version }, cookie)).result.subscription;
  await evaluate("document.querySelector('#website-editor-form').requestSubmit()");
  await until("document.querySelector('[data-draft-status]').textContent === 'All changes published'");
  assert.equal(await evaluate("window.dispatchEvent(new Event('beforeunload', { cancelable: true }))"), true);
  await screenshot("editor-390");
  const dialogCount = dialogs.length;
  await evaluate(`document.querySelector('a[href="/website${query}"]').click()`);
  await until("location.pathname === '/website'");
  assert.equal(dialogs.length, dialogCount);

  await send("Network.clearBrowserCookies");
  await navigate(`/sites/${businessId}`, "!!document.querySelector('.business-site')");
  assert.ok(await evaluate("document.body.innerText.includes('Your showcase starts here')"));
  assert.ok(await evaluate(`!!document.querySelector('a[href="/book/${businessId}"]')`));
  await navigate(`/book/${businessId}`, "!!document.querySelector('select[name=serviceId]')");
  await fill("serviceId", await evaluate("document.querySelector('select[name=serviceId] option:nth-child(2)').value"));
  await fill("locationId", await evaluate("document.querySelector('select[name=locationId] option:nth-child(2)').value"));
  await fill("date", date);
  await until("!!document.querySelector('select[name=startTime] option:nth-child(2)')");
  await tabTo("select[name=startTime]"); await key("ArrowDown", "ArrowDown", 40);
  assert.equal(await evaluate("document.querySelector('select[name=startTime]').value"), "09:00");
  for (const [name, value] of Object.entries({ firstName: "Showcase", lastName: "Visitor", email: `visitor-${stamp}@example.test`, phone: "2125550123" })) await keyboardFill(name, value);
  await screenshot("public-booking-390");
  await tabTo("form:has(select[name=serviceId]) button"); await key("Enter", "Enter", 13, "\r");
  await until("document.querySelector('[role=status]')?.textContent.includes('confirmed')");
  await setOwnerCookie();
  await navigate(`/calendar${query}&month=${date.slice(0, 7)}`, "document.body.innerText.includes('Showcase Visitor')");
  await screenshot("calendar-1440", 1440);
  await navigate(`/owner${query}`, "document.body.innerText.includes('Upcoming appointments') && document.body.innerText.includes('Showcase Visitor')");
  assert.ok(await evaluate(`!!document.querySelector('a[href="/calendar${query}&month=${date.slice(0, 7)}"]')`));
  await screenshot("upcoming-appointments-390");
  await navigate(`/customers${query}`, "document.body.innerText.includes('Showcase Visitor')");
  await screenshot("customers-390");
  console.log("PASS: new owner, simulated checkout, location form and duplicate feedback, services/hours, booking readiness, unpublished edit guard, publication after failed payment, published public site, visitor booking, and owner calendar/customer visibility.");
} finally { socket.close(); }
