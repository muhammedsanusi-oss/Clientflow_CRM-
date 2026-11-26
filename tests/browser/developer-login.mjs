// Verify the real test-account button and sign-in on an already running local demo.
// Use an isolated Chromium instance: this clears cookies in that browser only.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";

const base = process.env.API_BASE_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const browser = process.env.COLOR_BROWSER_URL ?? "http://localhost:9392";
const html = await (await fetch(`${base}/login`)).text();
const assets = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1].replaceAll("&amp;", "&"));
assert.ok(assets.some(asset => asset.includes("app/login/page.js")), "Expected the development login bundle.");
for (const asset of assets) assert.equal((await fetch(new URL(asset, base))).status, 200, `Login script unavailable: ${asset}`);

const targets = await (await fetch(`${browser}/json/list`)).json();
const target = targets.find(page => page.type === "page");
assert.ok(target, "Use an isolated browser with an open tab.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let id = 0;
const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data), task = pending.get(message.id);
  if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => { const sequence = ++id; pending.set(sequence, { resolve, reject }); socket.send(JSON.stringify({ id: sequence, method, params })); });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try { if (await evaluate(expression)) return; } catch { /* a navigation may replace the context */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function click(expression) {
  const position = await evaluate(`(() => { const el = (${expression}); if (!el) throw new Error('Missing button'); el.scrollIntoView({ block: 'center' }); const rect = el.getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...position });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...position });
}
try {
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.clearBrowserCookies"); await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Page.navigate", { url: `${base}/login` });
  await until("location.pathname === '/login' && document.readyState === 'complete' && !!document.querySelector('#email')");
  // Wait for hydration through a real click, allowing the pending client bundle to load.
  const button = "[...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Use test developer')";
  await click(button);
  await until("document.querySelector('#email').value === 'developer@clientflow.test'");
  assert.equal(await evaluate("document.querySelector('#password').value"), "Clientflow-test-2026!");
  assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"), false);
  mkdirSync("artifacts/developer-login", { recursive: true });
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync("artifacts/developer-login/test-credentials-filled.png", Buffer.from(screenshot.data, "base64"));
  await click("document.querySelector('button[type=submit]')");
  await until("location.pathname === '/' && !!document.querySelector('a[href=\"/businesses/new\"]')");
  assert.equal(await evaluate("!!document.querySelector('#login-error')"), false);
  console.log("PASS: all login scripts return 200; the actual Use test developer button fills credentials; sign-in opens the developer dashboard.");
} finally { socket.close(); }
