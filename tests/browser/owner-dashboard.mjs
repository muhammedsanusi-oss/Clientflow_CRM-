// Run with an isolated Chromium browser on port 9391 and pnpm dev running.
// pnpm exec node tests/browser/owner-dashboard.mjs
// Read-only checks; does not submit forms or edit saved business data.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";

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
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Network.clearBrowserCookies');
  const response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({email:'owner@clientflow.test',password:'Clientflow-test-2026!',accountType:'owner'})});
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie').split(';')[0], separator=cookie.indexOf('=');
  await send('Network.setCookie',{name:cookie.slice(0,separator),value:cookie.slice(separator+1),url:base,httpOnly:true});
  const dashboard='/owner?businessId=local-test-business';
  await send('Page.navigate',{url:base+dashboard});
  await until(`!!document.querySelector('.owner-dashboard')&&document.readyState==='complete'`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.od-group h2')].map(el=>el.textContent)`),['Website','Customers','Scheduling','Account & support']);
  assert.equal(await evaluate(`document.querySelectorAll('.owner-workspace-nav a').length`),1);
  const originalTheme=await evaluate(`document.querySelector('.owner-workspace').dataset.theme`);
  mkdirSync('artifacts/owner-dashboard',{recursive:true});
  for (const width of [1440,390]) {
    await evaluate(`document.querySelector('.owner-workspace').dataset.theme=${JSON.stringify(originalTheme)}`);
    await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});
    await evaluate(`scrollTo(0,0)`);
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),`Dashboard fits ${width}px`);
    assert.ok(await evaluate(`document.querySelector('.owner-workspace-business').getBoundingClientRect().top>=document.querySelector('body>header').getBoundingClientRect().bottom`),'Account header does not obscure identity');
    assert.ok(await evaluate(`[...document.querySelectorAll('.owner-dashboard a')].every(el=>el.getBoundingClientRect().height>=44)`),'44px actions');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(`artifacts/owner-dashboard/dashboard-${width}.png`,Buffer.from(shot.data,'base64'));
    for (const theme of ['BARBERSHOP','CONTACT','BAKERY','SALON']) {
      await evaluate(`document.querySelector('.owner-workspace').dataset.theme=${JSON.stringify(theme)}`);
      assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),`${theme} fits ${width}px`);
    }
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await evaluate(`document.documentElement.style.zoom='2'`);
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),'Dashboard fits 200 percent scale');
  await evaluate(`document.documentElement.style.zoom=''`);
  for (const path of ['/website?businessId=local-test-business','/subscription?businessId=local-test-business']) {
    await send('Page.navigate',{url:base+path});
    await until(`location.pathname+location.search===${JSON.stringify(path)}&&document.readyState==='complete'`);
    await until(`!!document.querySelector('main>a[href="${dashboard}"]')`);
    await evaluate(`document.querySelector('main>a[href="${dashboard}"]').click()`);
    await until(`location.pathname+location.search===${JSON.stringify(dashboard)}&&!!document.querySelector('.owner-dashboard')`);
  }
  await send('Page.navigate',{url:base+'/owner?businessId=foreign-dashboard'});
  await until(`document.readyState==='complete'&&document.body.textContent.includes('404')`);
  console.log('PASS owner dashboard: grouped tools, compact header, all four themes, desktop/mobile, 200 percent scale, preview/subscription return clicks, foreign 404; no subscription or saved data changes');
} finally { socket.close(); }
