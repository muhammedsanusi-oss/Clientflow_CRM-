// Run with an isolated Chromium browser on port 9391 and pnpm dev running.
// pnpm exec node tests/browser/business-overview.mjs
// Read-only checks; does not submit forms or edit saved business data.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";

const base = process.env.API_BASE_URL ?? "http://localhost:3000";
const browser = process.env.COLOR_BROWSER_URL ?? "http://localhost:9391";
const pages = await (await fetch(`${browser}/json/list`)).json();
const target = pages.find(page => page.type === "page" && (page.url === "about:blank" || page.url.startsWith(`${base}/businesses/local-test-business`)));
assert.ok(target, "Open an isolated browser with an about:blank tab before testing.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
let dialogResolver;
const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method === "Page.javascriptDialogOpening") dialogResolver?.(message.params);
  const operation = pending.get(message.id);
  if (operation) {
    pending.delete(message.id);
    message.error ? operation.reject(new Error(message.error.message)) : operation.resolve(message.result);
  }
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
try {
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ email: "developer@clientflow.test", password: "Clientflow-test-2026!", accountType: "developer" }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie").split(";")[0], separator = cookie.indexOf("=");
  await send("Network.setCookie", { name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: base, httpOnly: true });
  const url = `${base}/businesses/local-test-business`;
  await send("Page.navigate", { url });
  await until(`document.readyState==='complete'&&!!document.querySelector('.business-overview')`);
  mkdirSync("artifacts/business-overview", { recursive: true });
  for (const width of [1440, 390, 720]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: false });
    await evaluate(`scrollTo(0,0);new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), `No overflow at ${width}px`);
    assert.ok(await evaluate(`document.querySelector('.bo-back').getBoundingClientRect().top>=document.querySelector('body>header').getBoundingClientRect().bottom`), 'Content clears session header');
    assert.ok(await evaluate(`[...document.querySelectorAll('.business-overview a')].every(link=>link.getBoundingClientRect().height>=44)`), 'Touch targets are at least 44px');
    assert.ok(await evaluate(`[...document.querySelectorAll('.bo-details>.bo-card')].every(card=>card.getBoundingClientRect().right<=innerWidth)`));
    if (width === 390) assert.equal(await evaluate(`getComputedStyle(document.querySelector('.bo-details')).gridTemplateColumns.split(' ').length`), 1);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(`artifacts/business-overview/overview-${width}.png`, Buffer.from(shot.data, "base64"));
  }
  // Exercise large text and exceptionally long saved values without writing data.
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.documentElement.style.zoom='2';document.querySelector('.bo-intro h1').textContent='A very long business name with many words for wrapping';document.querySelector('.bo-fields dd a').textContent='a'.repeat(130)+'@example.test'`);
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), '200 percent scale wraps long content');
  await evaluate(`document.documentElement.style.zoom=''`);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 1100, deviceScaleFactor: 1, mobile: false });
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), 'Long values wrap on mobile');
  await evaluate(`document.activeElement.blur();document.body.focus()`);
  let focusedMain = false;
  for (let i = 0; i < 12; i++) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    if (await evaluate(`!!document.activeElement.closest('.business-overview')`)) {
      assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`), 'solid'); focusedMain = true; break;
    }
  }
  assert.ok(focusedMain, 'Overview is reachable using keyboard navigation');
  for (const [selector, destination] of [['.bo-primary', '/website'], ['.bo-destination', '/requests']]) {
    assert.equal(await evaluate(`document.querySelector('${selector}').getAttribute('href')`), `/businesses/local-test-business${destination}`);
  }
  assert.equal(await evaluate(`document.querySelector('.bo-secondary').target`), '_blank');
  await send("Page.navigate", { url: `${base}/businesses/unknown-overview-resource` });
  await until(`document.readyState==='complete'&&document.body.textContent.includes('404')`);
  await send("Network.clearBrowserCookies");
  await send("Page.navigate", { url });
  await until(`location.pathname==='/login'&&document.readyState==='complete'`);
  console.log('PASS overview: desktop/mobile, 200 percent text scale, long content, 44px targets, keyboard focus, destination links, unknown 404, signed-out redirect');
} finally { socket.close(); }
