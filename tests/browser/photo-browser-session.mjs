// Minimal CDP helpers for local photo verification; no application state is mocked.
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";

export function createPhotoFixture() {
  const crc = bytes => { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let i = 0; i < 8; i++) value = value >>> 1 ^ (value & 1 ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; };
  const chunk = (type, body) => { const data = Buffer.concat([Buffer.from(type), body]), size = Buffer.alloc(4), checksum = Buffer.alloc(4); size.writeUInt32BE(body.length); checksum.writeUInt32BE(crc(data)); return Buffer.concat([size, data, checksum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(1); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.from([0, 190, 65, 50]))), chunk("IEND", Buffer.alloc(0))]);
}
export async function photoBrowserSession(base, browser) {
  const pages = await (await fetch(`${browser}/json/list`)).json();
  const page = pages.find(item => item.type === "page");
  assert.ok(page, "Open an isolated Chromium tab.");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const session = { acceptDialog: false, dialogs: [] };
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === "Page.javascriptDialogOpening") {
      session.dialogs.push(message.params.message);
      void send("Page.handleJavaScriptDialog", { accept: session.acceptDialog });
    }
    const task = pending.get(message.id);
    if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
  };
  function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function until(expression) {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      try { if (await evaluate(expression)) return; } catch { /* navigation context replacement */ }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error(`Timed out: ${expression}`);
  }
  async function navigate(path, ready) {
    await send("Page.navigate", { url: base + path });
    await until(`location.pathname === ${JSON.stringify(path.split(/[?#]/)[0])} && document.readyState === 'complete' && (${ready})`);
  }
  async function select(label, value) {
    await evaluate(`(() => { const el = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  }
  async function upload(file) {
    const document = await send("DOM.getDocument");
    const input = await send("DOM.querySelector", { nodeId: document.root.nodeId, selector: 'input[aria-label="Upload product photo"]' });
    assert.ok(input.nodeId);
    await send("DOM.setFileInputFiles", { nodeId: input.nodeId, files: [file] });
  }
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.clearBrowserCookies");
  return Object.assign(session, { send, evaluate, until, navigate, select, upload, close: () => socket.close() });
}
