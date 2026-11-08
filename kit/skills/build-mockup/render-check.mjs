// Render check from a terminal: node kit/skills/build-mockup/render-check.mjs <group>/<topic> [screen-id]
// For an agent with no browser tool. Serves the site on a free port, opens lint.html in a headless Chrome, Edge or Chromium,
// waits for the result the page posts back, prints the findings. Exit code: 0 no error, 1 errors, 2 the check did not run.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT = resolve(KIT, "..");
const TIMEOUT_MS = 300_000;
const POLL_MS = 500;
const [topicArg, screen] = process.argv.slice(2);

function giveUp(message) {
  console.error(`Render check not done: ${message}`);
  process.exit(2);
}

if (!topicArg) giveUp("give a topic: render-check.mjs <group>/<topic> [screen-id]");
const topicDir = resolve(topicArg);
const topic = relative(ROOT, topicDir).split(sep).join("/");
if (!existsSync(join(topicDir, "topic.json"))) giveUp(`no topic.json in ${topicDir}.`);

// Headless, not the person's browser: a tab behind their window gets its timers held to one a second, then frozen,
// and the run stalls for minutes. The throwaway profile keeps their tabs, sign-ins and extensions out of it.
const { env } = process;
const browser = ({
  darwin: ["Google Chrome", "Microsoft Edge", "Chromium", "Brave Browser"].map((app) => `/Applications/${app}.app/Contents/MacOS/${app}`),
  win32: [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA].filter(Boolean).flatMap((dir) => [join(dir, "Google/Chrome/Application/chrome.exe"), join(dir, "Microsoft/Edge/Application/msedge.exe")]),
}[process.platform] || (env.PATH || "").split(delimiter).flatMap((dir) => ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"].map((name) => join(dir, name)))).find(existsSync);
if (!browser) giveUp("no Chrome, Edge or Chromium found. Open kit/skills/build-mockup/lint.html?topic=<group>/<topic> on the local server with a browser tool instead.");

const server = spawn(process.execPath, [join(KIT, "serve.mjs")], { stdio: ["ignore", "pipe", "inherit"] });
process.on("exit", () => server.kill());
const base = await new Promise((done) => {
  server.stdout.once("data", (data) => done(String(data).match(/http:\S+/)[0]));
  server.once("exit", () => giveUp("the local server did not start."));
});

const run = randomUUID();
const page = new URL("kit/skills/build-mockup/lint.html", `${base}/`);
page.searchParams.set("topic", topic);
if (screen) page.searchParams.set("screen", screen);
page.searchParams.set("report", run);

const profile = mkdtempSync(join(tmpdir(), "protopass-render-"));
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
// The page closes itself once its result is posted: an exit is a failure only with an error code.
chrome.once("error", () => giveUp(`could not run ${browser}.`)).once("exit", (code) => code && !result && giveUp(`${browser} stopped with code ${code}.`));

let result;
const deadline = Date.now() + TIMEOUT_MS;
while (!result) {
  if (Date.now() > deadline) giveUp(`no result after ${TIMEOUT_MS / 1000} s: the page stopped before posting it, or renders too slow.`);
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
for (const f of result.findings.filter((f) => f.level !== "accepted")) {
  const where = [f.device, f.screen, f.state, f.theme, f.brand].filter(Boolean).join(" ");
  console.log(`${f.code} ${f.level} ${where}: ${f.target}. ${f.message} -> ${f.fix}`);
}
console.log(`${topic}: ${result.renders} renders, ${result.errors} error(s), ${result.warnings} warning(s), ${result.accepted} accepted.`);
console.log("Measured, not looked at: this check does not replace step 6.");
process.exit(result.errors ? 1 : 0);
