// Render check from a terminal: node kit/skills/build-mockup/render-check.mjs <group>/<topic> [screen-id]
// For an agent with no browser tool. Serves the site on a free port, opens lint.html in the default browser, waits for
// the result the page posts back, prints the findings. Exit code: 0 no error, 1 errors, 2 the check did not run.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
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

// -g keeps the browser behind the current window. rundll32 takes the address as one argument: & needs no escaping.
const [command, ...args] = { darwin: ["open", "-g"], win32: ["rundll32", "url.dll,FileProtocolHandler"] }[process.platform] || ["xdg-open"];
spawn(command, [...args, page.href], { stdio: "ignore" })
  .once("error", () => giveUp(`could not run ${command}. Open ${page.href} in a browser, or use a browser tool.`))
  .once("exit", (code) => code && giveUp(`${command} found no browser.`));

let result;
const deadline = Date.now() + TIMEOUT_MS;
while (!result) {
  if (Date.now() > deadline) giveUp(`no result after ${TIMEOUT_MS / 1000} s: no browser on this machine, or renders too slow.`);
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  const res = await fetch(`${base}/__protopass/lint/${run}`, { headers: { "x-protopass": "lint" } });
  if (res.ok) result = await res.json();
}

if (result.error) giveUp(result.error);
for (const f of result.findings.filter((f) => f.level !== "accepted")) {
  const where = [f.device, f.screen, f.state, f.theme, f.brand].filter(Boolean).join(" ");
  console.log(`${f.code} ${f.level} ${where}: ${f.target}. ${f.message} -> ${f.fix}`);
}
console.log(`${topic}: ${result.renders} renders, ${result.errors} error(s), ${result.warnings} warning(s), ${result.accepted} accepted.`);
console.log("Measured, not looked at: this check does not replace step 6.");
process.exit(result.errors ? 1 : 0);
