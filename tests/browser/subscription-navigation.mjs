// Run with an isolated Chromium browser on port 9391 and pnpm dev running.
// pnpm exec node tests/browser/subscription-navigation.mjs
// Read-only checks; does not submit forms or edit saved business data.
import assert from "node:assert/strict";

const base = process.env.API_BASE_URL ?? "http://localhost:3000";
const browser = process.env.COLOR_BROWSER_URL ?? "http://localhost:9391";
const pages = await (await fetch(`${browser}/json/list`)).json();
const target = pages.find(page => page.type === "page" && (page.url === "about:blank" || page.url.startsWith(base)));
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
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  for (const accountType of ['developer','owner']) {
    await send('Network.clearBrowserCookies');
    const response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({email:`${accountType}@clientflow.test`,password:'Clientflow-test-2026!',accountType})});
    assert.equal(response.status,200);
    const cookie=response.headers.get('set-cookie').split(';')[0], separator=cookie.indexOf('=');
    await send('Network.setCookie',{name:cookie.slice(0,separator),value:cookie.slice(separator+1),url:base,httpOnly:true});
    await send('Page.navigate',{url:`${base}/subscription?businessId=local-test-business`});
    await until(`document.readyState==='complete'&&location.pathname==='/subscription'`);
    const expected=accountType==='developer'?'/businesses/local-test-business':'/owner?businessId=local-test-business';
    assert.equal(await evaluate(`document.querySelector('main>a:last-child').getAttribute('href')`),expected);
    await evaluate(`document.querySelector('main>a:last-child').click()`);
    await until(`location.pathname+location.search===${JSON.stringify(expected)}&&document.readyState==='complete'`);
    await until(accountType==='owner'?`!!document.querySelector('.owner-workspace')`:`!!document.querySelector('.business-overview')`);
    console.log(`PASS ${accountType}: return button reaches selected business ${accountType==='owner'?'owner dashboard':'details'}`);
  }
} finally { socket.close(); }
