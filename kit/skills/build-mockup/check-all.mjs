// Whole-site check without a browser, run locally and on GitHub (.github/workflows/check.yml):
// every script of the kit parses, every JSON file parses, every design system uses only variables that exist,
// every topic of every group passes validate.mjs.
// Usage: node kit/skills/build-mockup/check-all.mjs   Exit code 1 when anything fails.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = resolve(HERE, "../..");
const ROOT = resolve(KIT, "..");
const SKIP = new Set([".git", ".claude", "node_modules"]);
const failures = [];

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  if (SKIP.has(e.name)) return [];
  const p = join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const files = walk(ROOT);
const rel = (p) => relative(ROOT, p).replaceAll("\\", "/");

// Scripts of the kit
const scripts = files.filter((f) => f.startsWith(KIT) && [".js", ".mjs"].includes(extname(f)));
for (const f of scripts) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) failures.push(`${rel(f)}: does not parse\n${r.stderr.trim()}`);
}

// JSON files
const jsons = files.filter((f) => extname(f) === ".json");
for (const f of jsons) {
  try { JSON.parse(readFileSync(f, "utf8")); } catch (e) { failures.push(`${rel(f)}: invalid JSON (${e.message})`); }
}

const site = JSON.parse(readFileSync(join(ROOT, "protopass.json"), "utf8"));

// Design systems: an undefined var() fails silently in the browser, the declaration just stops applying.
const designSystems = [join(KIT, "minimaly"), ...Object.values(site.designSystems || {}).map((p) => join(ROOT, p))];
// A design system can extend another one: follow local @imports from ds.css.
const cssChain = (file, seen = new Set()) => {
  if (seen.has(file) || !existsSync(file)) return seen;
  seen.add(file);
  for (const m of readFileSync(file, "utf8").matchAll(/@import\s+"([^"]+)"/g)) cssChain(resolve(dirname(file), m[1]), seen);
  return seen;
};
for (const ds of designSystems) {
  const css = [...cssChain(join(ds, "ds.css"))];
  const dirs = [...new Set(css.map(dirname))];
  const scripts = dirs.map((d) => join(d, "ds.js")).filter(existsSync);
  const specimens = files.filter((f) => dirs.some((d) => f.startsWith(join(d, "components"))) && extname(f) === ".html");
  // Defined in CSS, set by a specimen's style attribute, or set at run time by ds.js.
  const defined = new Set([...css, ...scripts, ...specimens].flatMap((f) => [...readFileSync(f, "utf8").matchAll(/(--[\w-]+)\s*:|setProperty\("(--[\w-]+)"/g)].map((m) => m[1] || m[2])));
  for (const f of [...css, ...scripts].filter((x) => x.startsWith(ds))) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/var\((--[\w-]+)\s*\)/g)) {
      if (!defined.has(m[1])) failures.push(`${rel(f)}:${text.slice(0, m.index).split("\n").length}: undefined variable ${m[1]}`);
    }
  }
}

// Topics of every group
const topics = (site.groups || []).flatMap((g) => JSON.parse(readFileSync(join(ROOT, g.path, "topics.json"), "utf8")).map((t) => `${g.path}/${t}`));
for (const t of topics) {
  const r = spawnSync(process.execPath, [join(HERE, "validate.mjs"), join(ROOT, t)], { encoding: "utf8" });
  const last = r.stdout.trim().split("\n").pop();
  console.log(last);
  if (r.status !== 0) failures.push(`${t}: validator errors\n${r.stdout.split("\n").filter((l) => / error /.test(l)).join("\n")}`);
}

console.log(`${scripts.length} scripts, ${jsons.length} JSON files, ${topics.length} topics checked.`);
for (const f of failures) console.error(`FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
