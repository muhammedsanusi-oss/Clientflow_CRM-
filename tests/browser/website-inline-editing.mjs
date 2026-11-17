// Run with an isolated Chromium browser on port 9391 and pnpm dev running.
// pnpm exec node tests/browser/website-inline-editing.mjs
// All interactions edit drafts only; nothing is published.
import assert from "node:assert/strict";

const base = process.env.API_BASE_URL ?? "http://localhost:3000";
const browser = process.env.COLOR_BROWSER_URL ?? "http://localhost:9391";
const pages = await (await fetch(`${browser}/json/list`)).json();
const target = pages.find(page => page.type === "page" && (page.url === "about:blank" || page.url.startsWith(`${base}/businesses/local-test-business/website`)));
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
async function insertText(selector, text) {
  await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});element.focus();if(element instanceof HTMLInputElement){element.select()}else{const range=document.createRange();range.selectNodeContents(element);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range)}})()`);
  await send("Input.insertText", { text });
}
async function click(label) {
  await evaluate(`(()=>{const button=[...document.querySelectorAll('.site-inline-tools button')].find(button=>button.getAttribute('aria-label')===${JSON.stringify(label)}||button.textContent.trim()===${JSON.stringify(label)});if(!button)throw Error('Missing '+${JSON.stringify(label)});button.scrollIntoView({block:'center'});button.click()})()`);
  await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
}
async function color(kind, value) {
  await click(kind);
  await until(`!!document.querySelector('.site-color-popover')`);
  await insertText('.site-color-popover input[type="text"]', value);
  await until(`document.querySelector('.site-color-popover input[type="text"]').value===${JSON.stringify(value)}`);
  await click("Close color picker");
  await until(`!document.querySelector('.site-color-popover')`);
}
async function selectText(field, start, end) {
  await evaluate(`(()=>{const element=document.querySelector('[data-rich-field="${field}"]');element.focus();const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);const range=document.createRange();let offset=0,started=false;while(walker.nextNode()){const node=walker.currentNode,length=node.textContent.length;if(!started&&${start}<=offset+length){range.setStart(node,Math.max(0,${start}-offset));started=true}if(${end}<=offset+length){range.setEnd(node,Math.max(0,${end}-offset));break}offset+=length}const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range)})()`);
  await new Promise(resolve => setTimeout(resolve, 80));
}
try {
  await send("Page.enable"); await send("Page.bringToFront"); await send("Runtime.enable"); await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  for (const accountType of ["developer", "owner"]) {
    const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ email: `${accountType}@clientflow.test`, password: "Clientflow-test-2026!", accountType }) });
    assert.equal(response.status, 200, await response.clone().text());
    const cookie = response.headers.get("set-cookie").split(";")[0], separator = cookie.indexOf("=");
    await send("Network.setCookie", { name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: base, httpOnly: true });
    const url = `${base}/businesses/local-test-business/website?inline-test=${accountType}-${Date.now()}`;
    await send("Page.navigate", { url });
    await until(`location.href===${JSON.stringify(url)}&&document.readyState==='complete'`);
    await until(`Object.keys(document.querySelector('[data-rich-field="headline"]')??{}).some(key=>key.startsWith('__reactProps$'))`);
    assert.equal(await evaluate(`!!document.querySelector('aside[aria-label="Selected section settings"]')`), false);
    assert.equal(await evaluate(`!!document.querySelector('.site-inline-tools')`), false);
    const original = await evaluate(`document.querySelector('[data-rich-field="headline"]').textContent`);
    await evaluate(`document.querySelector('[data-website-editor-section="hero"]>.site-edit-trigger').click()`);
    await until(`!!document.querySelector('[aria-label="Editing hero section"]')`);
    assert.ok(await evaluate(`document.querySelector('[aria-label="Font size"]') instanceof HTMLSelectElement`));
    assert.deepEqual(await evaluate(`[...document.querySelector('[aria-label="Font size"]').options].map(option=>Number(option.value)).filter(value=>[8,9,10,11,12,14,16,18,20,22,24,26,28,36,48,72,96].includes(value))`), [8,9,10,11,12,14,16,18,20,22,24,26,28,36,48,72,96]);
    await insertText('[data-rich-field="headline"]', 'Hello colorful world');
    await until(`document.querySelector('[data-rich-field="headline"]').textContent==='Hello colorful world'`);
    await selectText('headline', 6, 14); await click('Bold');
    await until(`!![...document.querySelectorAll('[data-rich-field="headline"]>span')].find(span=>span.textContent==='colorful'&&span.style.fontWeight==='700')`);
    assert.ok(await evaluate(`!![...document.querySelectorAll('[data-rich-field="headline"]>span')].find(span=>span.textContent==='Hello '&&span.style.fontWeight==='')`));
    await evaluate(`(()=>{const field=document.querySelector('[aria-label="Font family"]');field.value='Georgia';field.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await until(`!![...document.querySelectorAll('[data-rich-field="headline"]>span')].find(span=>span.textContent==='colorful'&&span.style.fontFamily.includes('Georgia'))`);
    for (const [label, property, value] of [['Italic', 'fontStyle', 'italic'], ['Underline', 'textDecorationLine', 'underline']]) {
      await click(label);
      await until(`!![...document.querySelectorAll('[data-rich-field="headline"]>span')].find(span=>span.textContent==='colorful'&&span.style[${JSON.stringify(property)}].includes(${JSON.stringify(value)}))`);
    }
    await evaluate(`(()=>{const field=document.querySelector('[aria-label="Font size"]');field.value='48';field.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await until(`!![...document.querySelectorAll('[data-rich-field="headline"]>span')].find(span=>span.textContent==='colorful'&&span.style.fontSize==='48px')`);
    await color('Text color', '#123456');
    await until(`!![...document.querySelectorAll('[data-rich-field="headline"]>span')].find(span=>span.textContent==='colorful'&&getComputedStyle(span).color==='rgb(18, 52, 86)')`);
    const aboutBefore = await evaluate(`getComputedStyle(document.querySelector('[data-website-section="about"]')).backgroundColor`);
    await color('Section background color', '#E8F0FE');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-website-section="hero"]')).backgroundColor`), 'rgb(232, 240, 254)');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-website-section="about"]')).backgroundColor`), aboutBefore);
    await click('Undo');
    await until(`getComputedStyle(document.querySelector('[data-website-section="hero"]')).backgroundColor!=='rgb(232, 240, 254)'`);
    await color('Section background color', '#E8F0FE');
    await color('Page background color', '#E8F0FE');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.business-site')).backgroundColor`), 'rgb(232, 240, 254)');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.site-preview-banner')).backgroundColor`), 'rgb(232, 240, 254)');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-website-section="hero"]')).backgroundColor`), 'rgb(232, 240, 254)');
    await click('Text color'); await insertText('.site-color-popover input[type="text"]', '#12ZZ99');
    await until(`document.querySelector('button[form="website-editor-form"]').disabled`);
    await insertText('.site-color-popover input[type="text"]', '#112233'); await click('Close color picker');
    await until(`!document.querySelector('button[form="website-editor-form"]').disabled`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-website-section="hero"]')).outlineStyle`), "none");
    await evaluate(`document.querySelector('[data-website-editor-section="about"]>.site-edit-trigger').click()`);
    await until(`!!document.querySelector('[aria-label="Editing about section"]')`);
    assert.equal(await evaluate(`document.querySelector('[data-rich-field="headline"]').textContent`), 'Hello colorful world');
    await insertText('[data-rich-field="aboutText"]', 'Our independently edited story.');
    assert.equal(await evaluate(`document.querySelector('[data-rich-field="headline"]').textContent`), 'Hello colorful world');
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await click('Section background color');
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), 'No mobile horizontal overflow');
    assert.ok(await evaluate(`(()=>{const rect=document.querySelector('.site-color-popover').getBoundingClientRect();return rect.left>=0&&rect.right<=innerWidth})()`), 'Picker fits mobile viewport');
    assert.ok(await evaluate(`(()=>{const rect=document.querySelector('.site-color-popover').getBoundingClientRect();return rect.top>=76&&rect.bottom<=innerHeight})()`), 'Picker fits vertically below the session header');
    await click('Close color picker');
    // Large type must expand the section and line boxes, including unbroken words.
    const beforeHeight = await evaluate(`document.querySelector('[data-website-section="about"]').offsetHeight`);
    await insertText('[data-rich-field="aboutText"]', 'AnExtraordinarilyLongUnbrokenWordRepeatedWithoutSpaces AnExtraordinarilyLongUnbrokenWordRepeatedWithoutSpaces');
    await selectText('aboutText', 0, await evaluate(`document.querySelector('[data-rich-field="aboutText"]').textContent.length`));
    await evaluate(`(()=>{const size=document.querySelector('[aria-label="Font size"]');size.value='96';size.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await until(`!!document.querySelector('[data-rich-field="aboutText"] span[style*="96px"]')`);
    assert.ok(await evaluate(`document.querySelector('[data-website-section="about"]').offsetHeight>${beforeHeight}`), 'Section grows with large text');
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), 'Large text wraps on mobile');
    assert.ok(await evaluate(`(()=>{const field=document.querySelector('[data-rich-field="aboutText"]'),range=document.createRange();range.selectNodeContents(field);const rects=[...range.getClientRects()].filter(r=>r.width>0).sort((a,b)=>a.top-b.top);const lines=[];for(const rect of rects)if(!lines.some(line=>Math.abs(line.top-rect.top)<1))lines.push(rect);return lines.length>1&&lines.every((line,i)=>!i||line.top>=lines[i-1].bottom-1)})()`), 'Large text lines do not overlap');
    await click('Text color');
    await evaluate(`scrollTo(0,document.querySelector('.site-inline-tools').getBoundingClientRect().top+scrollY-100)`);
    const positions = await evaluate(`({toolbar:document.querySelector('.site-inline-tools').getBoundingClientRect().top+scrollY,picker:document.querySelector('.site-color-popover').getBoundingClientRect().top+scrollY,scroll:scrollY})`);
    await evaluate(`scrollBy(0,300);new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    assert.ok(await evaluate(`scrollY>${positions.scroll}+200`), 'The page actually scrolled');
    assert.ok(await evaluate(`Math.abs(document.querySelector('.site-inline-tools').getBoundingClientRect().top+scrollY-${positions.toolbar})<2`), 'Toolbar remains at its section position');
    assert.ok(await evaluate(`Math.abs(document.querySelector('.site-color-popover').getBoundingClientRect().top+scrollY-${positions.picker})<2`), 'Color picker scrolls with its section');
    await click('Close color picker');
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    if (accountType === 'developer') {
      await selectText('headline', 0, await evaluate(`document.querySelector('[data-rich-field="headline"]').textContent.length`));
      await until(`!!document.querySelector('[aria-label="Editing hero section"]')`);
      await evaluate(`(()=>{const size=document.querySelector('[aria-label="Font size"]');size.value='96';size.dispatchEvent(new Event('change',{bubbles:true}))})()`);
      await until(`getComputedStyle(document.querySelector('[data-rich-field="headline"] span')).fontSize==='96px'`);
      for (const template of ['BAKERY','BARBERSHOP','SALON','CONTACT']) {
        await evaluate(`(()=>{const select=document.querySelector('[aria-label="Website template"]');select.value=${JSON.stringify(template)};select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
        await until(`!!document.querySelector('.site-theme-${template.toLowerCase()}')`);
        for (const width of [1440,390]) {
          await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width===390});
          assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), `${template} wraps 96px text at ${width}px`);
          assert.ok(await evaluate(`document.querySelector('[data-website-section="offerings"]').getBoundingClientRect().top>=document.querySelector('[data-website-section="about"]').getBoundingClientRect().bottom`), `${template} large text does not overlap the next section`);
        }
      }
      await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
      console.log('PASS all four templates: 96px text wraps and sections expand at desktop and mobile widths');
    }
    const previousLoad = await evaluate('performance.timeOrigin');
    await send('Page.reload'); await until(`performance.timeOrigin!==${previousLoad}&&document.readyState==='complete'`); await until(`Object.keys(document.querySelector('[data-rich-field="headline"]')??{}).some(key=>key.startsWith('__reactProps$'))`);
    assert.equal(await evaluate(`document.querySelector('[data-rich-field="headline"]').textContent`), original, 'Refresh discards draft formatting/text');
    console.log(`PASS ${accountType}: no section editing outline, size dropdown, growing text, stationary toolbar/picker, inline formatting, live colors, undo, validation, mobile, refresh`);
  }
} finally { socket.close(); }
