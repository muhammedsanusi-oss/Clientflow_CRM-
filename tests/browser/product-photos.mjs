// Disposable development server, isolated CLIENTFLOW_DEV_INSTANCE, and local Azurite required.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { photoBrowserSession } from "./photo-browser-session.mjs";

const base = process.env.API_BASE_URL ?? "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Disposable local data only.");
const browser = await photoBrowserSession(base, process.env.COLOR_BROWSER_URL ?? "http://localhost:9392");
const { send, evaluate, until, navigate, select, upload } = browser;
mkdirSync("tmp/product-photos", { recursive: true }); mkdirSync("artifacts/product-photos", { recursive: true });

function png(red, green, blue) {
  const crc = bytes => { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let i = 0; i < 8; i++) value = value >>> 1 ^ (value & 1 ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; };
  const chunk = (type, body) => { const data = Buffer.concat([Buffer.from(type), body]), length = Buffer.alloc(4), checksum = Buffer.alloc(4); length.writeUInt32BE(body.length); checksum.writeUInt32BE(crc(data)); return Buffer.concat([length, data, checksum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(160); header.writeUInt32BE(100, 4); header[8] = 8; header[9] = 2;
  const rows = Buffer.alloc(100 * (1 + 160 * 3));
  for (let y = 0; y < 100; y++) for (let x = 0; x < 160; x++) { const index = y * 481 + 1 + x * 3; rows[index] = red; rows[index + 1] = green; rows[index + 2] = blue; }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}
const red = png(190, 65, 50), blue = png(45, 95, 180);
const redFile = resolve("tmp/product-photos/red.png"), blueFile = resolve("tmp/product-photos/blue.png"), badFile = resolve("tmp/product-photos/invalid.png");
writeFileSync(redFile, red); writeFileSync(blueFile, blue); writeFileSync(badFile, "not a PNG");
async function post(path, body, cookie) {
  const response = await fetch(base + path, { method: "POST", headers: { origin: base, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  const result = await response.json(); assert.ok(response.ok, JSON.stringify(result)); return { response, result };
}
async function setCookie(cookie) { const index = cookie.indexOf("="); await send("Network.setCookie", { name: cookie.slice(0, index), value: cookie.slice(index + 1), url: base, httpOnly: true }); }
const panel = 'document.querySelector(\'[aria-labelledby="product-photos-title"]\')';
const count = () => evaluate(`${panel}.querySelectorAll('[data-photo-section]').length`);
async function add(file, expected) {
  await upload(file); await until(`${panel}.querySelectorAll('[data-photo-section]').length === ${expected} && !document.querySelector('[aria-busy=true]')`);
}
async function publish() {
  await evaluate("document.querySelector('#website-editor-form').requestSubmit()");
  await until("document.querySelector('[data-draft-status]').textContent === 'All changes published'");
}
async function fillInput(selector, value) {
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
}
async function sizedPhotos(selector) {
  const dimensions = await evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(selector)})].filter(img => img.closest('figure')).map(img => ({ width: img.getBoundingClientRect().width, slot: img.closest('figure').getBoundingClientRect().width, height: img.getBoundingClientRect().height, percent: parseFloat(img.style.width), natural: img.naturalWidth / img.naturalHeight })))()`);
  for (const image of dimensions) {
    assert.ok(Math.abs(image.width / image.slot * 100 - image.percent) < 1, 'Chosen width must actually render');
    assert.ok(Math.abs(image.width / image.height - image.natural) < .03, 'Sized photos keep original proportions');
  }
}
async function bytes(id, locator, expected) {
  const response = await fetch(`${base}/api/sites/${id}/image/${locator}?check=${Date.now()}`, { cache: "no-store" });
  assert.equal(response.status, 200, locator); assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
}
async function screenshot(name, width) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate("window.scrollTo(0, 0)");
  assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `Overflow: ${name}`);
  const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`artifacts/product-photos/${name}.png`, Buffer.from(image.data, "base64"));
}

async function renderedPhotos(selector, colors) {
  await until(`(() => { const images = [...document.querySelectorAll(${JSON.stringify(selector)})]; return images.length === ${colors.length} && images.every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0); })()`);
  const rendered = await evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(selector)})].map(image => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, 1, 1);
    const rect = image.getBoundingClientRect(), style = getComputedStyle(image);
    return { pixel: [...context.getImageData(0, 0, 1, 1).data].slice(0, 3), visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' };
  }))()`);
  assert.ok(rendered.every(image => image.visible), `Hidden or collapsed website image: ${selector}`);
  assert.deepEqual(rendered.map(image => image.pixel), colors, `Wrong rendered photo/order: ${selector}`);
}
async function publicRender(id, section, colors, screenshotName) {
  await send("Network.clearBrowserCookies");
  await navigate(`/sites/${id}`, "!!document.querySelector('.business-site')");
  const selector = `[data-website-section="${section}"] img`;
  for (const width of [1440, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await renderedPhotos(selector, colors);
    await sizedPhotos(selector);
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"));
    if (screenshotName) {
      const rect = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}).closest('.site-image-gallery') ?? document.querySelector(${JSON.stringify(selector)}).parentElement; const rect = el.getBoundingClientRect(); return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height, scale: 1 }; })()`);
      const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: rect });
      writeFileSync(`artifacts/product-photos/${screenshotName}-${width}.png`, Buffer.from(image.data, "base64"));
    }
  }
  await evaluate("window.__photoReloadProbe = true");
  await send("Page.reload");
  await until("!window.__photoReloadProbe && document.readyState === 'complete' && !!document.querySelector('.business-site')");
  await renderedPhotos(selector, colors);
}
const redPixel = [190, 65, 50], bluePixel = [45, 95, 180];
async function editor(id, cookie) {
  await setCookie(cookie);
  await navigate(`/businesses/${id}/website`, "!!document.querySelector('[data-photo-allowance]')");
}

try {
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  let first;
  for (const template of ["BAKERY", "BARBERSHOP", "SALON", "CONTACT"]) {
    const stamp = `${Date.now()}-${template.toLowerCase()}`;
    const signup = await post("/api/auth/signup", {
      name: `${template} photo demo`, first_name: "Photo", last_name: "Owner", business_type: template === "CONTACT" ? "OTHER" : template,
      email: `${stamp}@example.test`, owner_email: `owner-${stamp}@example.test`, phone_number: "2125550100",
      password: "Photo-demo-password-2026!", password_confirmation: "Photo-demo-password-2026!",
      description: "Fictional product photos for the showcase.", website_template: template, website_plan: "PREMIUM",
      billing_street: "100 Example Street", billing_city: "Example City", billing_state: "NY", billing_zip: "10001",
    });
    const id = new URL(signup.result.redirectTo, base).searchParams.get("businessId");
    const cookie = signup.response.headers.get("set-cookie").split(";")[0];
    const subscription = (await post("/api/subscription", { businessId: id, scenario: "PAY_SUCCESS", plan: "MANAGED", expectedVersion: 0 }, cookie)).result.subscription;
    await setCookie(cookie);
    await navigate(`/businesses/${id}/website`, "!!document.querySelector('[data-photo-allowance]')");
    assert.ok(await evaluate("document.querySelector('[data-photo-allowance]').textContent.includes('of 50')"));
    if (template === "BAKERY") await screenshot('styled-empty-editor-1440', 1440);
    await add(redFile, 1); await add(blueFile, 2);
    await renderedPhotos('#website-preview [data-website-section="offerings"] img', [redPixel, bluePixel]);
    assert.equal((await fetch(`${base}/api/sites/${id}/image/offerings-0`)).status, 404, "Draft upload must stay private");
    await fillInput('input[aria-label^="Product name for"]', 'Strawberry cake');
    await fillInput('input[aria-label^="Product price for"]', '24.999');
    assert.equal(await evaluate("document.querySelector('button[form=website-editor-form]').disabled"), true);
    await fillInput('input[aria-label^="Product price for"]', '24.50');
    await until("!document.querySelector('button[form=website-editor-form]').disabled");
    for (const [size, width] of [['Small', 33], ['Medium', 66], ['Large', 100]]) {
      await evaluate(`document.querySelector('.photo-size-presets button:nth-child(${size === 'Small' ? 1 : size === 'Medium' ? 2 : 3})').click()`);
      await until(`parseFloat(document.querySelector('#website-preview figure img').style.width) === ${width}`);
      await sizedPhotos('#website-preview [data-website-section="offerings"] img');
    }
    await evaluate("document.querySelector('input[type=range][aria-label^=\"Photo width\"]').focus()");
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', windowsVirtualKeyCode: 37 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', windowsVirtualKeyCode: 37 });
    await until("parseFloat(document.querySelector('#website-preview figure img').style.width) === 99");
    await evaluate("document.querySelector('.photo-size-presets button:nth-child(2)').click()");
    assert.ok(await evaluate("document.querySelector('#website-preview figure').textContent.includes('Strawberry cake') && document.querySelector('#website-preview figure').textContent.includes('$24.50')"));
    if (template === 'BAKERY') await screenshot('styled-populated-editor-1440', 1440);
    await screenshot(`${template.toLowerCase()}-editor-390`, 390);
    await publish();
    await bytes(id, "offerings-0", red); await bytes(id, "offerings-1", blue);
    const publicHtml = await (await fetch(`${base}/sites/${id}`)).text();
    assert.ok(publicHtml.includes(`/image/offerings-0?photo=`));
    await publicRender(id, "offerings", [redPixel, bluePixel], `${template.toLowerCase()}-published-gallery`);
    assert.ok(await evaluate("document.querySelector('figure').textContent.includes('Strawberry cake') && document.querySelector('figure').textContent.includes('$24.50')"));
    assert.equal(await evaluate("document.querySelector('figure img').style.width"), '66%');
    if (!first) first = { id, cookie, subscription };
  }
  const { id, cookie } = first;
  await setCookie(cookie);
  await navigate(`/businesses/${id}/website`, "!!document.querySelector('[data-photo-allowance]')");
  const originalSources = await evaluate(`${panel}.querySelectorAll('img').length && [...${panel}.querySelectorAll('img')].map(image => image.src)`);
  await select("Move photo 1 from Products & offerings", "about");
  await until(`${panel}.querySelectorAll('[data-photo-section=about]').length === 1`);
  assert.equal(await count(), 2);
  const movedSource = await evaluate(`${panel}.querySelector('[data-photo-section=about] img').src`);
  assert.equal(movedSource, originalSources[0], "Draft preview must use the original published locator");
  await publish(); await bytes(id, "about-0", red); await bytes(id, "offerings-0", blue);
  assert.equal((await fetch(`${base}/api/sites/${id}/image/offerings-1`)).status, 404);
  await publicRender(id, "about", [redPixel], "moved-about");
  await renderedPhotos('[data-website-section="offerings"] img', [bluePixel]);
  await editor(id, cookie);
  await select("Move photo 1 from About", "offerings");
  await evaluate("document.querySelector('[aria-label=\"Move photo 2 earlier in Products & offerings\"]').click()");
  await publish(); await bytes(id, "offerings-0", red); await bytes(id, "offerings-1", blue);
  await publicRender(id, "offerings", [redPixel, bluePixel], "reordered-offerings");
  await editor(id, cookie);
  await upload(badFile);
  await until("[...document.querySelectorAll('[role=alert]')].some(el => el.textContent.includes('valid JPG'))");
  assert.equal(await count(), 2);
  await evaluate("document.querySelector('[aria-label=\"Remove photo 1 from Products & offerings\"]').click()");
  assert.equal(await count(), 2, "Canceling removal must retain placement");
  browser.acceptDialog = true;
  await evaluate("document.querySelector('[aria-label=\"Remove photo 2 from Products & offerings\"]').click()");
  await until(`${panel}.querySelectorAll('[data-photo-section]').length === 1`);
  browser.acceptDialog = false;
  await publish();
  let subscription = (await post("/api/subscription", { businessId: id, scenario: "PAY_SUCCESS", plan: "STANDARD", expectedVersion: first.subscription.version }, cookie)).result.subscription;
  await navigate(`/businesses/${id}/website`, "document.querySelector('[data-photo-allowance]')?.textContent.includes('of 10')");
  // Fill the site-wide allowance with real uploads, then verify both UI and direct API rejection.
  for (let index = 2; index <= 10; index++) await add(index % 2 ? redFile : blueFile, index);
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Upload product photo\"]').disabled"), true);
  await publish();
  const form = new FormData(); form.set("image", new Blob([red], { type: "image/png" }), "extra.png");
  const excess = await fetch(`${base}/api/sites/${id}/images/about`, { method: "POST", headers: { origin: base, cookie }, body: form });
  assert.equal(excess.status, 409);
  subscription = (await post("/api/subscription", { businessId: id, scenario: "PAY_SUCCESS", plan: "CRM", expectedVersion: subscription.version }, cookie)).result.subscription;
  await navigate(`/businesses/${id}/website`, "document.querySelector('[data-photo-allowance]')?.textContent.includes('of 20')");
  await select("Photo destination", "about"); await add(blueFile, 11); await publish();
  subscription = (await post("/api/subscription", { businessId: id, scenario: "PAY_SUCCESS", plan: "STANDARD", expectedVersion: subscription.version }, cookie)).result.subscription;
  await navigate(`/businesses/${id}/website`, "document.querySelector('[data-photo-allowance]')?.textContent.includes('of 10')");
  assert.ok(await evaluate(`${panel}.textContent.includes('Remove 1 to publish')`));
  await bytes(id, "about-0", blue);
  await screenshot("downgrade-390", 390);
  // Keyboard reaches the destination picker; selecting a different section works without a mouse.
  await evaluate("document.querySelector('select[aria-label=\"Photo destination\"]').focus()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowDown", windowsVirtualKeyCode: 40 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", windowsVirtualKeyCode: 40 });
  assert.notEqual(await evaluate("document.querySelector('select[aria-label=\"Photo destination\"]').value"), "offerings");
  subscription = (await post("/api/subscription", { businessId: id, scenario: "PAY_SUCCESS", plan: "CRM", expectedVersion: subscription.version }, cookie)).result.subscription;
  await editor(id, cookie);
  await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Add text section').click()");
  await until("!!document.querySelector('select[aria-label=\"Photo destination\"] option[value=\"custom-0\"]')");
  let sourceLabel = "Products & offerings";
  for (const [destination, label] of [["header", "Header"], ["hero", "Hero"], ["features", "Features"], ["contact", "Contact"], ["custom-0", "New section"]]) {
    await select(`Move photo 1 from ${sourceLabel}`, destination);
    await renderedPhotos(`#website-preview [data-website-section="${destination}"] img`, [redPixel]);
    await publish();
    await publicRender(id, destination, [redPixel], `placement-${destination}`);
    await editor(id, cookie);
    sourceLabel = label;
  }
  console.log("PASS: uploaded photos visibly decode with correct pixels/order in the live preview and published websites on all four templates at 1440px and 390px, survive reload, and render in every supported destination; quota and upload regressions also pass.");
} finally { browser.close(); }
