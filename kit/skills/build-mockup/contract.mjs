// Prints a design system's contract for an agent: roles with their use and values, safe pairs, forbidden primitives.
// Usage: node kit/skills/build-mockup/contract.mjs <design system name>
// Computed from the CSS at each run, so it cannot go stale. A role's use is the comment at the end of its line in tokens.css.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readTokens } from "./roles.mjs";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT = resolve(KIT, "..");
const site = JSON.parse(readFileSync(join(ROOT, "protopass.json"), "utf8"));
const systems = { Minimaly: join(KIT, "minimaly"), ...Object.fromEntries(Object.entries(site.designSystems || {}).map(([name, path]) => [name, join(ROOT, path)])) };
const name = process.argv[2] || "Minimaly";
if (!systems[name]) {
  console.error(`Unknown design system "${name}". Use one of: ${Object.keys(systems).join(", ")}.`);
  process.exit(2);
}
const css = ["tokens.css", "foundations.css"].map((f) => join(systems[name], f)).filter(existsSync).map((f) => readFileSync(f, "utf8")).join("\n");
const { primitives, roles, others, pairs } = readTokens(css);
const short = (n) => n.replace(/^--color-/, "");
const families = [...new Set([...others.keys()].map((n) => (n.slice(2).includes("-") ? n.replace(/-[^-]+$/, "-*") : n)))];

console.log(`# ${name} contract\n`);
console.log("Screens read roles only. A role changes with the theme, a primitive does not, and M112 refuses primitives in a screen.\n");
console.log("| Role | Light | Dark | Use |\n|---|---|---|---|");
for (const r of roles) console.log(`| \`${r.name}\` | ${r.light ?? "?"} | ${r.dark ?? "?"} | ${r.usage} |`);
console.log("\n## Safe pairs\n\n4.5:1 in light and in dark, so fit for body text.\n");
for (const p of pairs) if (p.safe.length) console.log(`- \`${p.name}\` on ${p.safe.map(short).join(", ")}`);
console.log("\n## Large text and icons only\n\n3:1 in light and in dark.\n");
for (const p of pairs) if (p.large.length) console.log(`- \`${p.name}\` on ${p.large.map(short).join(", ")}`);
console.log(`\n## Other tokens\n\n${families.map((f) => `\`${f}\``).join(", ")}\n`);
console.log(`## Forbidden in screens\n\n${[...primitives].map((p) => `\`${p}\``).join(", ")}`);
