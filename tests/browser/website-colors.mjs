// Compatibility entry for the former site-wide color drill.
// Run against an isolated Chromium browser with remote debugging on port 9387.
process.env.COLOR_BROWSER_URL ??= "http://localhost:9387";
await import("./website-inline-editing.mjs");
