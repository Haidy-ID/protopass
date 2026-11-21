// Run: node --test kit/playground/patterns.test.mjs
// Break-it-on-purpose proof: mounts valid and intentionally broken fixtures in a throwaway workshop,
// runs check.mjs through headless Chrome, and verifies every injected keyboard/ARIA defect is caught.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..");
const site = mkdtempSync(join(tmpdir(), "protopass-patterns-"));
after(() => rmSync(site, { recursive: true, force: true }));

const write = (name, text) => {
  mkdirSync(dirname(join(site, name)), { recursive: true });
  writeFileSync(join(site, name), text);
};

write("protopass.json", JSON.stringify({ designSystems: { TestDS: "design-systems/test-ds" } }));
write("kit/playground/playground.css", "");
mkdirSync(join(site, "kit/playground"), { recursive: true });
copyFileSync(join(KIT, "serve.mjs"), join(site, "kit/serve.mjs"));
for (const file of ["check.html", "check.mjs", "patterns.js"]) {
  copyFileSync(join(HERE, file), join(site, "kit/playground", file));
}

const page = (body, script = "") =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fixture</title></head><body>${body}<script>${script}</script></body></html>`;

const tabsMarkup = (labelAttr, secondTabIndex = "-1") => `
  <div role="tablist" ${labelAttr}>
    <button role="tab" id="t1" aria-controls="p1" aria-selected="true" tabindex="0">One</button>
    <button role="tab" id="t2" aria-controls="p2" aria-selected="false" tabindex="${secondTabIndex}">Two</button>
    <button role="tab" id="t3" aria-controls="p3" aria-selected="false" tabindex="-1">Three</button>
  </div>
  <div role="tabpanel" id="p1" aria-labelledby="t1">Panel 1</div>
  <div role="tabpanel" id="p2" aria-labelledby="t2" hidden>Panel 2</div>
  <div role="tabpanel" id="p3" aria-labelledby="t3" hidden>Panel 3</div>
`;

const tabsScript = `
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (t, focus) => {
    for (const x of tabs) {
      const on = x === t;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
    }
    if (focus) t.focus();
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t) select(t, false);
  });
  document.addEventListener("keydown", (e) => {
    const t = e.target.closest('[role="tab"]');
    if (!t) return;
    const i = tabs.indexOf(t);
    const next = { ArrowRight: tabs[(i + 1) % tabs.length], ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length], Home: tabs[0], End: tabs.at(-1) }[e.key];
    if (next) { e.preventDefault(); select(next, true); }
  });
`;

const fixtures = [
  { id: "tabs-ok", name: "Tabs OK", pattern: "tabs", html: page(tabsMarkup('aria-label="Sections"'), tabsScript) },
  { id: "tabs-unnamed", name: "Tabs unnamed", pattern: "tabs", html: page(tabsMarkup(""), tabsScript) },
  { id: "tabs-two-stops", name: "Tabs two stops", pattern: "tabs", html: page(tabsMarkup('aria-label="Sections"', "0"), "") },
  { id: "tabs-no-keys", name: "Tabs no keys", pattern: "tabs", html: page(tabsMarkup('aria-label="Sections"'), "") },
  {
    id: "dialog-no-escape",
    name: "Dialog no escape",
    pattern: "dialog",
    html: page(
      `<button id="open" type="button" data-open="dlg">Open</button><dialog id="dlg" aria-label="Settings"><button id="inside" type="button">OK</button></dialog>`,
      `const dlg = document.getElementById("dlg");
       document.getElementById("open").addEventListener("click", () => dlg.showModal());
       dlg.addEventListener("cancel", (e) => e.preventDefault());
       document.addEventListener("keydown", (e) => { if (e.key === "Escape") e.preventDefault(); });`
    ),
  },
  {
    id: "switch-no-toggle",
    name: "Switch no toggle",
    pattern: "switch",
    html: page(`<button type="button" role="switch" aria-checked="false">Dark mode</button>`),
  },
];

write(
  "design-systems/test-ds/components.json",
  JSON.stringify(fixtures.map(({ id, name, pattern }) => ({ id, class: id, name, pattern, variants: ["default"], states: ["default"] })))
);
for (const f of fixtures) write(`design-systems/test-ds/components/${f.id}.html`, f.html);

const runCheck = (...args) =>
  spawnSync(process.execPath, [join(site, "kit/playground/check.mjs"), "--ds", "TestDS", ...args], {
    encoding: "utf8",
    timeout: 60_000,
  });

test("valid fixture passes with exit code 0", (t) => {
  const res = runCheck("tabs-ok");
  if (res.status === 2 && /no Chrome, Edge, Chromium or Brave found/i.test(res.stderr)) {
    t.skip("No local Chrome/Edge/Chromium available");
    return;
  }
  assert.equal(res.status, 0, `expected exit 0, got ${res.status}\nstdout:\n${res.stdout}\nstderr:\n${res.stderr}`);
  assert.match(res.stdout, /TestDS: 1 specimen\(s\), 0 failed, 0 issue\(s\)/);
});

test("each intentionally broken fixture is caught by patterns.js", (t) => {
  const res = runCheck();
  if (res.status === 2 && /no Chrome, Edge, Chromium or Brave found/i.test(res.stderr)) {
    t.skip("No local Chrome/Edge/Chromium available");
    return;
  }
  assert.equal(res.status, 1, `expected exit 1, got ${res.status}\nstdout:\n${res.stdout}\nstderr:\n${res.stderr}`);
  assert.doesNotMatch(res.stdout, /^tabs-ok \(/m, "valid fixture must not report issues");
  assert.match(res.stdout, /^tabs-unnamed \(.*\): pattern \(tabs\): .*no accessible name/m);
  assert.match(res.stdout, /^tabs-two-stops \(.*\): pattern \(tabs\): .*2 tab stops/m);
  assert.match(res.stdout, /^tabs-no-keys \(.*\): pattern \(tabs\): .*ArrowRight/m);
  assert.match(res.stdout, /^dialog-no-escape \(.*\): pattern \(dialog\): .*Escape/m);
  assert.match(res.stdout, /^switch-no-toggle \(.*\): pattern \(switch\): .*Space/m);
  assert.match(res.stdout, /TestDS: 6 specimen\(s\), 5 failed/);
});
