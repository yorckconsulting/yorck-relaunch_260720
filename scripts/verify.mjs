import { spawn } from "node:child_process";
import process from "node:process";

const root = new URL("../", import.meta.url);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const managedBrowserEnvironment = {
  PLAYWRIGHT_MANAGED_BROWSER: "1"
};
const runningServers = new Set();

function run(command, args, environment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...environment },
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with ${signal || `exit code ${code}`}`));
    });
  });
}

function startServer(command, args, label) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const logs = [];
  const collect = (chunk) => {
    logs.push(chunk.toString());
    if (logs.length > 100) logs.shift();
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  child.label = label;
  child.recentLogs = logs;
  runningServers.add(child);
  return child;
}

async function waitForServer(child, url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${child.label} exited before it was ready:\n${child.recentLogs.join("")}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${child.label} did not become ready at ${url}:\n${child.recentLogs.join("")}`);
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) {
    if (child) runningServers.delete(child);
    return;
  }
  const exited = new Promise((resolve) => child.once("exit", resolve));
  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch {}
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
  if (child.exitCode === null) {
    try {
      if (process.platform === "win32") child.kill("SIGKILL");
      else process.kill(-child.pid, "SIGKILL");
    } catch {}
  }
  runningServers.delete(child);
}

async function main() {
  let staticServer;
  let pagesServer;
  try {
    await run(npmCommand, ["run", "test:unit"]);

    staticServer = startServer("python3", ["serve.py", "8765", "."], "Static preview");
    await waitForServer(staticServer, "http://127.0.0.1:8765/", 15000);
    for (const browser of ["chromium", "firefox", "webkit"]) {
      await run(npmCommand, ["run", "test:compat"], {
        ...managedBrowserEnvironment,
        BROWSER: browser,
        BASE_URL: "http://127.0.0.1:8765"
      });
    }
    for (const script of ["test:browser", "test:strips", "test:performance", "test:cwv"]) {
      await run(npmCommand, ["run", script], {
        ...managedBrowserEnvironment,
        BROWSER: "chromium",
        BASE_URL: "http://127.0.0.1:8765"
      });
    }
    await stopServer(staticServer);
    staticServer = undefined;

    pagesServer = startServer(
      npxCommand,
      ["--no-install", "wrangler", "dev", "--ip", "127.0.0.1", "--port", "8788", "--log-level", "error"],
      "Cloudflare Worker runtime"
    );
    await waitForServer(pagesServer, "http://127.0.0.1:8788/", 45000);
    await run(npmCommand, ["run", "test:pages", "--", "http://127.0.0.1:8788"]);
    await run(npmCommand, ["run", "test:csp", "--", "http://127.0.0.1:8788"], {
      ...managedBrowserEnvironment,
      BROWSER: "chromium"
    });

    console.log("All local quality gates passed.");
  } finally {
    await Promise.allSettled([stopServer(staticServer), stopServer(pagesServer)]);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await Promise.allSettled([...runningServers].map(stopServer));
    process.exit(128 + (signal === "SIGINT" ? 2 : 15));
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
