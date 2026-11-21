// Specimen check from a terminal: node kit/playground/check.mjs [--ds <name>] [component-id]
// Serves the site on a free port, opens kit/playground/check.html in a headless Chrome, Edge, Chromium or Brave,
// waits for the result the page posts back, prints the issues. Exit code: 0 all OK, 1 issues found, 2 check did not run.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 300_000;
const POLL_MS = 500;
const USAGE = "Usage: node kit/playground/check.mjs [--ds <name>] [component-id]";

function giveUp(message) {
  console.error(`Specimen check not done: ${message}`);
  process.exit(2);
}

let ds = "Minimaly";
let component;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    console.log(USAGE);
    process.exit(0);
  }
  if (arg === "--ds") {
    if (i + 1 >= args.length || args[i + 1].startsWith("-")) giveUp(`missing value for --ds. ${USAGE}`);
    ds = args[++i];
  } else if (arg.startsWith("--ds=")) {
    ds = arg.slice(5);
    if (!ds) giveUp(`missing value for --ds. ${USAGE}`);
  } else if (arg.startsWith("-")) {
    giveUp(`unknown option ${arg}. ${USAGE}`);
  } else if (!component) {
    component = arg;
  } else {
    giveUp(`unexpected argument ${arg}. ${USAGE}`);
  }
}

// Headless, not the person's browser: a tab behind their window gets its timers throttled, then frozen,
// and the run stalls. The throwaway profile keeps their tabs, sign-ins and extensions out of it.
const { env } = process;
const browser = ({
  darwin: ["Google Chrome", "Microsoft Edge", "Chromium", "Brave Browser"].map((app) => `/Applications/${app}.app/Contents/MacOS/${app}`),
  win32: [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA].filter(Boolean).flatMap((dir) => [
    join(dir, "Google/Chrome/Application/chrome.exe"),
    join(dir, "Microsoft/Edge/Application/msedge.exe"),
    join(dir, "BraveSoftware/Brave-Browser/Application/brave.exe"),
  ]),
}[process.platform] || (env.PATH || "").split(delimiter).flatMap((dir) => ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"].map((name) => join(dir, name)))).find(existsSync);
if (!browser) giveUp("no Chrome, Edge, Chromium or Brave found. Open kit/playground/check.html on the local server with a browser tool instead.");

const started = Date.now();
const server = spawn(process.execPath, [join(KIT, "serve.mjs")], { stdio: ["ignore", "pipe", "inherit"] });
process.on("exit", () => server.kill());
const base = await new Promise((done) => {
  server.stdout.once("data", (data) => done(String(data).match(/http:\S+/)[0]));
  server.once("exit", () => giveUp("the local server did not start."));
});

const run = randomUUID();
const page = new URL("kit/playground/check.html", `${base}/`);
page.searchParams.set("ds", ds);
if (component) page.searchParams.set("component", component);
page.searchParams.set("report", run);

const profile = mkdtempSync(join(tmpdir(), "protopass-check-"));
const flags = ["--headless=new", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"];
const chrome = spawn(browser, [...flags, page.href], { stdio: "ignore" });
const removeProfile = () => {
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch {}
};
// After a failure, at best: the browser may still be writing to its profile.
process.on("exit", () => {
  chrome.kill();
  removeProfile();
});
let result;
// The page closes itself once its result is posted: an exit is a failure only with an error code.
chrome.once("error", () => giveUp(`could not run ${browser}.`)).once("exit", (code) => code && !result && giveUp(`${browser} stopped with code ${code}.`));

const deadline = Date.now() + TIMEOUT_MS;
while (!result) {
  if (Date.now() > deadline) giveUp(`no result after ${TIMEOUT_MS / 1000} s: the page stopped before posting it, or runs too slow.`);
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  const res = await fetch(`${base}/__protopass/lint/${run}`, { headers: { "x-protopass": "lint" } });
  if (res.ok) result = await res.json();
}
// The browser writes to its profile until it exits: the folder goes once it has.
if (chrome.exitCode === null && chrome.signalCode === null) {
  const stopped = new Promise((done) => chrome.once("exit", done));
  chrome.kill();
  await stopped;
}
removeProfile();

if (result.error) giveUp(result.error);
let issueCount = 0;
for (const c of result.components) {
  for (const issue of c.issues) {
    console.log(`${c.id} (${c.name}): ${issue}`);
    issueCount++;
  }
}
const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`${result.ds}: ${result.total} specimen(s), ${result.failed} failed, ${issueCount} issue(s) in ${seconds}s.`);
process.exit(result.failed ? 1 : 0);
