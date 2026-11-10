import { spawn } from "node:child_process";

const baseUrl = "http://localhost:3000";
const loginUrl = `${baseUrl}/login`;
const timeoutAt = Date.now() + 120_000;
let lastStatus = "the server has not responded yet";

await openLoginWhenReady();

async function openLoginWhenReady() {
  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(2_000),
      });

      if (response.ok) {
        const health = await response.json();
        if (health.status === "ok" && health.db === "ok") {
          await openBrowser(loginUrl);
          console.log(`Opened ${loginUrl}`);
          return;
        }
        lastStatus = "the web server is running but the database is not ready";
      } else {
        lastStatus = `the health endpoint returned HTTP ${response.status}`;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Could not open ${loginUrl}: ${lastStatus}`);
}

function openBrowser(url) {
  const [command, args] = process.platform === "win32"
    ? ["cmd.exe", ["/c", "start", "", url]]
    : process.platform === "darwin"
      ? ["open", [url]]
      : ["xdg-open", [url]];

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore", windowsHide: true });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Browser launcher exited with code ${code}`));
    });
  });
}
