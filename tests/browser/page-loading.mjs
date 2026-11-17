// Run with an isolated Chromium browser on port 9391 and pnpm dev running.
// pnpm exec node tests/browser/page-loading.mjs
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
let held = [];
const originalHandler = socket.onmessage;
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Fetch.requestPaused') {
    const headers = message.params.request.headers;
    if (Object.entries(headers).some(([key,value])=>key.toLowerCase()==='rsc'&&value==='1') && !Object.keys(headers).some(key=>key.toLowerCase()==='next-router-prefetch')) held.push(message.params.requestId);
    else void send('Fetch.continueRequest',{requestId:message.params.requestId});
  }
  originalHandler(event);
};
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  const response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({email:'owner@clientflow.test',password:'Clientflow-test-2026!',accountType:'owner'})});
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie').split(';')[0], separator=cookie.indexOf('=');
  await send('Network.setCookie',{name:cookie.slice(0,separator),value:cookie.slice(separator+1),url:base,httpOnly:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:base+'/owner?businessId=local-test-business'});
  await until(`!!document.querySelector('.owner-dashboard')&&Object.keys(document.querySelector('body>header a')??{}).some(key=>key.startsWith('__reactProps$'))`);
  await new Promise(resolve=>setTimeout(resolve,700));
  await send('Fetch.enable',{patterns:[{urlPattern:base+'/subscription*',requestStage:'Request'}]});
  await evaluate(`document.querySelector('body>header a').click()`);
  await until(`!!document.querySelector('.cf-navigation-loading[role="status"]')`);
  assert.ok(held.length>0,'A real navigation response is held during this check');
  assert.equal(await evaluate(`document.querySelector('.cf-navigation-loading').textContent`),'Loading page...');
  mkdirSync('artifacts/page-loading',{recursive:true});
  for (const width of [1440,390]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),'Loader fits the viewport');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(`artifacts/page-loading/loading-${width}.png`,Buffer.from(shot.data,'base64'));
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.cf-navigation-loading .cf-loading-spinner')).animationName`),'none');
  for (const requestId of held) await send('Fetch.continueRequest',{requestId}); held=[];
  await send('Fetch.disable');
  await until(`location.pathname==='/subscription'&&!document.querySelector('.cf-page-loading,.cf-navigation-loading')&&document.querySelector('h1')?.textContent==='Demo subscription'`);
  for (const role of ['public','developer']) {
    await send('Network.clearBrowserCookies');
    if (role==='developer') {
      const login=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({email:'developer@clientflow.test',password:'Clientflow-test-2026!',accountType:'developer'})});
      assert.equal(login.status,200); const value=login.headers.get('set-cookie').split(';')[0], split=value.indexOf('=');
      await send('Network.setCookie',{name:value.slice(0,split),value:value.slice(split+1),url:base,httpOnly:true});
    }
    const from=role==='public'?'/signup':'/', to=role==='public'?'/login':'/businesses/new';
    await send('Page.navigate',{url:base+from});
    await until(`location.pathname===${JSON.stringify(from)}&&document.readyState==='complete'&&!!document.querySelector('a[href="${to}"]')`);
    await until(`Object.keys(document.querySelector('a[href="${to}"]')).some(key=>key.startsWith('__reactProps$'))`);
    await send('Fetch.enable',{patterns:[{urlPattern:base+to+'*',requestStage:'Request'}]});
    await evaluate(`document.querySelector('a[href="${to}"]').click()`);
    await until(`!!document.querySelector('.cf-navigation-loading')`);
    assert.ok(held.length>0,`${role} navigation really waits`);
    for (const requestId of held) await send('Fetch.continueRequest',{requestId}); held=[];
    await send('Fetch.disable');
    await until(`location.pathname===${JSON.stringify(to)}&&!document.querySelector('.cf-navigation-loading,.cf-page-loading')&&!!document.querySelector('form')`);
    console.log(`PASS ${role}: pending feedback clears when navigation finishes`);
  }
  console.log('PASS real delayed navigation: visible loading status, desktop/mobile fit, reduced motion, clears after completion; no data changes');
} finally {
  for (const requestId of held) await send('Fetch.continueRequest',{requestId});
  await send('Fetch.disable'); socket.close();
}
