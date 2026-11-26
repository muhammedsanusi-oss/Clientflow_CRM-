// Run with an isolated Chromium browser on port 9391 and pnpm dev running.
// pnpm exec node tests/browser/artifacts/ux-audit/browser-audit.mjs
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
const rows = [];
const id = 'local-test-business', query = `?businessId=${id}`;
const routes = {
  developer: ['/', `/businesses/${id}`, '/businesses/new', `/businesses/${id}/website`, `/businesses/${id}/requests`, `/businesses/${id}/managed-service`, '/notifications', '/custom-crm-requests', `/subscription${query}`],
  owner: ['/owner', `/calendar${query}`, `/calendar/hours${query}`, `/calendar/services${query}`, `/customers${query}`, `/customers/new${query}`, `/notes${query}`, `/inquiries${query}`, `/website${query}`, `/businesses/${id}/website`, `/managed-service${query}`, `/subscription${query}`],
  public: ['/login', '/signup', '/signup?option=tailored', '/setup-password', `/sites/${id}`, `/book/${id}`],
};
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  for (const [role, paths] of Object.entries(routes)) {
    await send('Network.clearBrowserCookies');
    let cookie = '';
    if (role !== 'public') {
      const response = await fetch(`${base}/api/auth/login`, { method:'POST', headers:{origin:base,'content-type':'application/json'}, body:JSON.stringify({email:`${role}@clientflow.test`,password:'Clientflow-test-2026!',accountType:role}) });
      assert.equal(response.status,200); cookie=response.headers.get('set-cookie').split(';')[0];
      const split=cookie.indexOf('='); await send('Network.setCookie',{name:cookie.slice(0,split),value:cookie.slice(split+1),url:base,httpOnly:true});
    }
    for (const path of paths) {
      const http = await fetch(base+path,{headers:cookie?{cookie}:{},redirect:'follow'});
      for (const width of [1440,390]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
        const before=await evaluate('performance.timeOrigin');
        await send('Page.navigate',{url:base+path});
        await until(`performance.timeOrigin!==${before}&&document.readyState==='complete'`);
        const metrics=await evaluate(`(()=>{const bar=document.querySelector('body>header'),main=document.querySelector('main'),r=bar?.getBoundingClientRect();const hits=r&&main?[...main.querySelectorAll('a,h1,h2,input,button')].filter(el=>{const q=el.getBoundingClientRect();return q.width&&q.height&&q.left<r.right&&q.right>r.left&&q.top<r.bottom&&q.bottom>r.top}).map(el=>el.textContent.trim().slice(0,70)):[];return {url:location.pathname+location.search,title:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth-innerWidth,headerOverlaps:hits,smallTargets:main?[...main.querySelectorAll('button,a')].filter(el=>{const q=el.getBoundingClientRect();return q.width&&q.height&&q.height<40}).length:0,headings:[...document.querySelectorAll('main h2')].map(el=>el.textContent.trim()),ownerNav:[...document.querySelectorAll('.owner-workspace-nav a')].map(el=>({label:el.textContent,href:el.getAttribute('href')})),links:main?[...main.querySelectorAll('a')].map(el=>({label:el.textContent.trim(),href:el.getAttribute('href')})):[]}})()`);
        rows.push({role,path,width,status:http.status,...metrics});
        if (width===390 && ['/businesses/'+id+'/website','/calendar'+query,'/website'+query].includes(path)) {
          const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
          writeFileSync(`artifacts/ux-audit/${role}-${path.includes('/businesses/')?'editor':path.startsWith('/calendar')?'calendar':'preview'}-390.png`,Buffer.from(shot.data,'base64'));
        }
      }
    }
    console.log(`Audited ${role}: ${paths.length} routes at desktop/mobile widths`);
    writeFileSync('artifacts/ux-audit/browser-results.json',JSON.stringify(rows,null,2));
  }
  console.log(JSON.stringify({checks:rows.length,overflow:rows.filter(r=>r.overflow>1).map(r=>({role:r.role,path:r.path,width:r.width,overflow:r.overflow})),headerOverlaps:rows.filter(r=>r.headerOverlaps.length).map(r=>({role:r.role,path:r.path,width:r.width,items:r.headerOverlaps})),errors:rows.filter(r=>r.status>=400).map(r=>({role:r.role,path:r.path,status:r.status}))}));
} finally { writeFileSync('artifacts/ux-audit/browser-results.json',JSON.stringify(rows,null,2));socket.close(); }
