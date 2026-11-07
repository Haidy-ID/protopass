// Static validator for a topic's screens against its design system.
// Usage: node kit/skills/build-mockup/validate.mjs <group>/<topic> [screen-id]
// Prints one line per finding: CODE level file:line message -> fix. Exit code 1 when an error is found.
// With a screen id, only the findings of that screen's file count. Shared CSS and topic.json need the whole run.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readTokens } from "./roles.mjs";
import { COLOR_PROP, MARKUP_COLOR_ATTR, rawColors, scriptColors } from "./raw-color.mjs";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT = resolve(KIT, "..");
const site = JSON.parse(readFileSync(join(ROOT, "protopass.json"), "utf8"));
const topicDir = resolve(process.argv[2] || ".");
const findings = [];
const report = (code, level, file, line, message, fix) => findings.push({ code, level, file, line, message, fix });
const read = (p) => readFileSync(p, "utf8");
const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const blank = (m) => m.replace(/[^\n]/g, " ");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, blank);
// Script comments: the // of a url in a string is not one.
const stripScriptComments = (code) => code.replace(/\/\*[\s\S]*?\*\/|(?<![:"'`\\])\/\/.*/g, blank);
const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, blank);

// Innermost rules only: selector + declarations, @media wrappers skipped.
const rules = (css) => [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2], index: m.index + m[1].length }));
const customProps = (css) => new Map([...stripComments(css).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const classesIn = (selector) => [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]);

// --- Topic -------------------------------------------------------------------------------------
const topicPath = join(topicDir, "topic.json");
if (!existsSync(topicPath)) {
  console.error(`No topic.json in ${topicDir}`);
  process.exit(2);
}
const topic = JSON.parse(read(topicPath));
const rel = (p) => relative(topicDir, p).replaceAll("\\", "/");
const onlyId = process.argv[3];
const onlyScreen = onlyId && (topic.screens || []).find((s) => s.id === onlyId);
if (onlyId && !onlyScreen) {
  console.error(`No screen "${onlyId}" in ${topicPath}`);
  process.exit(2);
}
// Design systems: Minimaly ships with the kit, the others are declared in protopass.json → designSystems.
const DESIGN_SYSTEMS = { Minimaly: join(KIT, "minimaly"), ...Object.fromEntries(Object.entries(site.designSystems || {}).map(([name, path]) => [name, join(ROOT, path)])) };

// Screens use Minimaly unless the topic names another design system. A free prototype alone needs none.
if (topic.screens?.length) topic.ds ||= "Minimaly";
const dsDir = DESIGN_SYSTEMS[topic.ds] || "";
if (topic.ds && !existsSync(join(dsDir, "ds.css"))) {
  report("M002", "error", "topic.json", 1, `Unknown design system "${topic.ds}".`, `Use one of: ${Object.keys(DESIGN_SYSTEMS).join(", ")}, or declare it in protopass.json → designSystems.`);
}
// The path from a screen to a design system file, for the fixes that write an import.
const dsFile = (name) => relative(join(topicDir, "screens"), join(dsDir, name)).replaceAll("\\", "/");

const TEAMS = site.teams || [];
for (const team of topic.teams || []) {
  if (TEAMS.length && !TEAMS.includes(team)) report("M109", "error", "topic.json", 1, `Unknown team "${team}".`, `Use one of: ${TEAMS.join(", ")}, or add it to protopass.json → teams.`);
}

const DEVICE_NAMES = ["mobile", "tablet", "desktop"];
for (const d of topic.devices || []) {
  if (!DEVICE_NAMES.includes(d)) report("M110", "error", "topic.json", 1, `Unknown device "${d}".`, `Use some of: ${DEVICE_NAMES.join(", ")} (omit the field to enable all).`);
}

// --- Design system knowledge -------------------------------------------------------------------
const dsCss = ["tokens.css", "foundations.css", "charts.css", "components.css"].map((f) => join(dsDir, f)).filter(existsSync).map(read).join("\n");
const dsProps = customProps(dsCss);
const tokens = readTokens(["tokens.css", "foundations.css"].map((f) => join(dsDir, f)).filter(existsSync).map(read).join("\n"));
const dsClasses = new Set();
const dsVariants = new Map(); // class -> Set(variant)
for (const r of rules(existsSync(join(dsDir, "components.css")) ? read(join(dsDir, "components.css")) : "")) {
  for (const sel of r.selector.split(",")) {
    classesIn(sel).forEach((c) => dsClasses.add(c));
    for (const m of sel.matchAll(/\.([\w-]+)\[data-variant="([\w-]+)"\]/g)) {
      if (!dsVariants.has(m[1])) dsVariants.set(m[1], new Set());
      dsVariants.get(m[1]).add(m[2]);
    }
  }
}
const components = existsSync(join(dsDir, "components.json")) ? JSON.parse(read(join(dsDir, "components.json"))) : [];
// Light values live in the first :root block; used to suggest the token matching a raw color.
const lightProps = customProps((dsCss.match(/:root[^{]*\{[^}]*\}/) || [""])[0]);
const colorNames = (hex) => [...lightProps].filter(([, v]) => v.toLowerCase() === hex.toLowerCase()).map(([n]) => n);

// --- Topic sources -----------------------------------------------------------------------------
const screensDir = join(topicDir, "screens");
const screenFiles = existsSync(screensDir) ? readdirSync(screensDir, { recursive: true }).map(String).map((f) => join(screensDir, f)) : [];
const cssFiles = screenFiles.filter((f) => f.endsWith(".css"));
const localCss = cssFiles.map((f) => ({ file: f, text: read(f) }));
const localProps = new Map(localCss.flatMap(({ text }) => [...customProps(text)]));
const localClasses = new Set(localCss.flatMap(({ text }) => rules(text).flatMap((r) => classesIn(r.selector))));
const htmlFiles = [];
for (const s of topic.screens || []) {
  for (const st of s.states || []) {
    if (typeof st !== "object" || typeof st.name !== "string") report("M206", "error", "topic.json", 1, `Screen "${s.id}": state ${JSON.stringify(st)} is not { "name", "note" }.`, 'Write each state as { "name": "Error", "note": "What the user sees" }.');
  }
}
for (const x of topic.qa || []) if (typeof x?.q !== "string" || typeof x?.a !== "string") report("M208", "error", "topic.json", 1, `Q&A entry ${JSON.stringify(x)} is not { "q", "a" }.`, 'Write each entry as { "q": "Is the return date required?", "a": "No, a loan without one stays open." }.');
for (const s of topic.screens || []) {
  const p = join(topicDir, s.file);
  if (!existsSync(p)) report("M201", "error", "topic.json", 1, `Screen "${s.id}" points to missing file ${s.file}.`, "Create the file or fix screens[].file.");
  else htmlFiles.push({ screen: s, file: p, text: read(p) });
}

// Raw values in declarations: colors (error) and sizes a foundation token already covers (warning).
// Each CSS property maps to the token family that should replace its raw value.
const SIZE_FAMILY = [
  [/^font-size$/, /^--font-size-/],
  [/^line-height$/, /^--line-height-/],
  [/^(padding|margin)[\w-]*$|^(row-|column-)?gap$/, /^--spacing-/],
  [/^border[\w-]*radius$/, /^--radius-/],
  [/^(min-|max-)?height$/, /^--control-height$/],
];
// Color tokens are matched by role words, whatever the design system's naming (--color-text-primary, --text-…).
const COLOR_FAMILY = [
  [/^(color|fill|stroke)$/, /text|icon/],
  [/^background(-color)?$/, /surface|background|bg/],
  [/^(border|outline)[\w-]*$/, /border|line/],
];
// Paths a file loads (@import, src, href), resolved from the file: to check it really loads the design system.
const loads = (file, text) => [...text.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)|\s(?:src|href)="([^"]+)"/g)].map((m) => resolve(dirname(file), m[1] || m[2]));
const familyOf = (table, prop) => (table.find(([p]) => p.test(prop)) || [])[1];
// A line that needs a fixed color says why, here and for M112: /* allow-primitive: a scene that stays dark in both themes */
const exempt = (text, line) => text.split("\n")[line - 1].includes("allow-primitive:");
const reportColor = (file, text, line, color, where, fix) => {
  if (!exempt(text, line)) report("M101", "error", rel(file), line, `Raw color ${color} in ${where}.`, fix || `Use a role: node kit/skills/build-mockup/contract.mjs "${topic.ds}".`);
};
// A control rebuilt by hand looks right and bypasses the design system: its states, its sizes, its theme.
const HAND_MADE_FIX = `Use a component from ${topic.ds}/catalog/, or follow new-component/SKILL.md.`;
const checkControl = (file, line, tag, before) => {
  if (!/^<button\b/.test(tag) && !/\srole=["']button["']/.test(tag)) return;
  const quoted = tag.match(/\sclass=(?:"([^"]*)"|'([^']*)')/);
  const cls = quoted?.[1] ?? quoted?.[2] ?? "";
  if (cls.includes("$") || cls.split(/\s+/).some((c) => dsClasses.has(c))) return;
  // Bare buttons the design system styles from their slot: number steppers and sortable headers.
  if (/\sdata-step=/.test(tag) || /<th\b[^>]*>\s*$/.test(before)) return;
  if (cls.trim()) report("M114", "warning", rel(file), line, `Button with the topic class "${cls.trim()}": its hover, focus and disabled states are yours to build.`, HAND_MADE_FIX);
  else report("M113", "error", rel(file), line, "Button without a class.", HAND_MADE_FIX);
};
function checkDeclarations(file, text, css, offset) {
  // A declaration ends on ; or }, never on { : that keeps selectors out and reaches the rules around a nested one.
  for (const m of css.replace(/url\([^)]*\)/g, (u) => u.replaceAll(";", " ")).matchAll(/([\w-]+)\s*:\s*([^;{}]+)(?=[;}]|$)/g)) {
    const [, prop, value] = m;
    const line = lineOf(text, offset + m.index);
    if (prop === "all" && /unset|initial|revert/.test(value)) report("M113", "error", rel(file), line, `"all: ${value.trim()}" rebuilds a control by hand.`, HAND_MADE_FIX);
    if (prop.startsWith("--")) {
      if (tokens.names.has(prop)) report("M111", "error", rel(file), line, `${prop} is redefined outside a brand.`, 'Put it in a file of brands/, declared in topic.json → brands: see restyle.md.');
      for (const c of rawColors(value)) reportColor(file, text, line, c, `"${prop}"`);
      continue;
    }
    for (const c of rawColors(value, { named: COLOR_PROP.test(prop) })) {
      const family = familyOf(COLOR_FAMILY, prop);
      const all = c.startsWith("#") ? colorNames(c) : [];
      const names = family && all.some((n) => family.test(n)) ? all.filter((n) => family.test(n)) : all;
      reportColor(file, text, line, c, `"${prop}"`, names.length ? `Use var(${names.join(") or var(")}).` : "");
    }
    const sizeFamily = familyOf(SIZE_FAMILY, prop);
    if (sizeFamily) {
      for (const px of value.matchAll(/(?<![\w-])(\d+(?:\.\d+)?px)\b/g)) {
        const hit = [...dsProps].find(([n, v]) => v === px[1] && sizeFamily.test(n));
        if (hit) report("M105", "warning", rel(file), line, `Raw ${px[1]} in "${prop}".`, `Use var(${hit[0]}).`);
      }
    }
    for (const v of value.matchAll(/var\((--[\w-]+)/g)) {
      if (!dsProps.has(v[1]) && !localProps.has(v[1])) report("M104", "error", rel(file), line, `Undefined variable ${v[1]}.`, `Check the name in ${topic.ds}/tokens.css or foundations.css.`);
    }
  }
}

for (const { file, text } of localCss) {
  checkDeclarations(file, text, stripComments(text), 0);
  if (topic.ds && !loads(file, text).includes(join(dsDir, "ds.css"))) {
    report("M106", "error", rel(file), 1, `Does not import the ${topic.ds} design system.`, `Start with @import "${dsFile("ds.css")}";`);
  }
}

const stateId = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// A primitive stays the same in both themes: a screen reads roles. Topic scripts count, they write styles too.
const topicScripts = screenFiles.filter((f) => f.endsWith(".js")).map((f) => ({ file: f, text: read(f) }));
const checkScript = (file, text, code, offset) => {
  const clean = stripScriptComments(code);
  for (const c of scriptColors(clean)) reportColor(file, text, lineOf(text, offset + c.index), c.value, "a script");
  for (const m of clean.matchAll(/\ball\s*:\s*["'`]?(unset|initial|revert)/g)) report("M113", "error", rel(file), lineOf(text, offset + m.index), `"all: ${m[1]}" in a script rebuilds a control by hand.`, HAND_MADE_FIX);
  for (const m of clean.matchAll(/<[a-z][\w-]*\b[^>]*>/g)) checkControl(file, lineOf(text, offset + m.index), m[0], clean.slice(Math.max(0, m.index - 80), m.index));
};
for (const { file, text } of topicScripts) checkScript(file, text, text, 0);
for (const { file, text } of [...localCss, ...htmlFiles, ...topicScripts]) {
  for (const m of (file.endsWith(".css") ? stripComments(text) : text).matchAll(/var\((--[\w-]+)/g)) {
    const line = lineOf(text, m.index);
    if (tokens.primitives.has(m[1]) && !exempt(text, line)) report("M112", "error", rel(file), line, `Primitive ${m[1]} in a screen.`, `Use a role: node kit/skills/build-mockup/contract.mjs "${topic.ds}".`);
  }
}

// A brand restyles a topic's screens with tokens alone. The first one is imported by screens.css, the viewer and the linter
// add any other after it: same selectors as the design system, so order wins and an alternative must replace all of the first.
const brandFile = (name) => join(topicDir, "brands", `${stateId(name)}.css`);
const brandTokens = (topic.brands || []).map((name) => {
  const file = brandFile(name);
  const names = new Set();
  if (!existsSync(file)) {
    report("M111", "error", "topic.json", 1, `Brand "${name}" has no file.`, `Create brands/${stateId(name)}.css, see restyle.md.`);
    return { name, names };
  }
  const text = read(file);
  const covered = { light: new Set(), dark: new Set() };
  const roles = new Set(tokens.roles.map((r) => r.name));
  for (const r of rules(text.replace(/@import[^;]+;/g, (m) => m.replace(/[^\n]/g, " ")))) {
    const line = lineOf(text, r.index);
    const selectors = r.selector.split(",").map((s) => s.trim());
    if (!selectors.every((s) => /^:root(\[data-theme(="(light|dark)")?\])?$/.test(s))) report("M111", "error", rel(file), line, `Selector "${r.selector}" in a brand.`, 'A brand sets tokens on :root, :root[data-theme="light"] and :root[data-theme="dark"] only.');
    for (const m of r.body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) {
      const [, prop, value] = m;
      if (!tokens.names.has(prop) || tokens.primitives.has(prop)) report("M111", "error", rel(file), line, `${prop} is not a token a brand can set.`, `Set the roles and foundation tokens of ${topic.ds}: see the contract.`);
      for (const v of value.matchAll(/var\((--[\w-]+)/g)) if (!dsProps.has(v[1])) report("M104", "error", rel(file), line, `Undefined variable ${v[1]}.`, `Check the name in ${topic.ds}/tokens.css.`);
      names.add(prop);
      for (const t of ["light", "dark"]) if (selectors.some((s) => s === ":root" ? false : s.includes(`"${t}"`) || s === ":root[data-theme]")) covered[t].add(prop);
    }
  }
  for (const prop of names) {
    if (!roles.has(prop)) continue;
    for (const t of ["light", "dark"]) if (!covered[t].has(prop)) report("M111", "error", rel(file), 1, `${prop} has no ${t} value.`, `A role changes with the theme: set it in :root[data-theme="${t}"] too.`);
  }
  return { name, names };
});
for (const { name, names } of brandTokens.slice(1)) {
  const first = brandTokens[0];
  for (const prop of first.names) if (!names.has(prop)) report("M111", "error", "topic.json", 1, `Brand "${name}" does not set ${prop}, which "${first.name}" sets.`, "Every brand sets the same tokens: the first one would show through.");
}
if (topic.brands?.length) {
  const imports = localCss.flatMap(({ file, text }) => loads(file, text));
  if (!imports.includes(brandFile(topic.brands[0]))) report("M111", "error", "topic.json", 1, `screens.css does not import brand "${topic.brands[0]}".`, `Add @import "../brands/${stateId(topic.brands[0])}.css"; after the design system.`);
  for (const name of topic.brands.slice(1)) if (imports.includes(brandFile(name))) report("M111", "error", "topic.json", 1, `screens.css imports brand "${name}".`, "Only the first brand is imported: the viewer adds the others.");
}

const usedComponents = new Set();
const SIGNATURES = [
  ["toast", /\btoast\(/],
  ["tooltip", /\sdata-tip="/],
  ["async-button", /\sdata-(?:busy|done|error|copy)="/],
  ["hold-button", /\sdata-hold\b/],
];
for (const { screen, file, text } of htmlFiles) {
  const page = stripHtmlComments(text);
  for (const m of page.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) checkDeclarations(file, text, stripComments(m[1]), m.index + m[0].indexOf(m[1]));
  // Colors hard-coded in scripts (D3 fills, strokes, scales) bypass the tokens like raw CSS values.
  for (const m of page.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) checkScript(file, text, m[1], m.index + m[0].indexOf(m[1]));
  const markup = page.replace(/<(style|script)\b[\s\S]*?<\/\1>/g, blank);
  for (const tag of markup.matchAll(/<[a-z][\w-]*\b[^>]*>/g)) {
    for (const a of tag[0].matchAll(/\s([\w-]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      const value = a[2] ?? a[3] ?? a[4];
      const index = tag.index + a.index;
      if (a[1] === "style") checkDeclarations(file, text, value, index);
      else if (/^on/.test(a[1])) checkScript(file, text, value, index);
      else if (MARKUP_COLOR_ATTR.test(a[1])) for (const c of rawColors(value)) reportColor(file, text, lineOf(text, index), c, `the ${a[1]} attribute`);
    }
  }
  // Chart cards are built by chart.js at run time: the mount call is the use.
  if (text.includes("VChart.mount(")) usedComponents.add("chart");
  // Components recognized by their trigger, not by a class: built by ds.js at run time, or sharing .btn with button.
  for (const [id, trigger] of SIGNATURES) if (trigger.test(text) && components.some((c) => c.id === id)) usedComponents.add(id);
  for (const tag of markup.matchAll(/<[a-z][\w-]*\b[^>]*>/g)) {
    const quoted = tag[0].match(/\sclass=(?:"([^"]*)"|'([^']*)')/);
    const cls = (quoted?.[1] ?? quoted?.[2] ?? "").split(/\s+/).filter(Boolean);
    const line = lineOf(text, tag.index);
    checkControl(file, line, tag[0], markup.slice(Math.max(0, tag.index - 80), tag.index));
    for (const c of cls) {
      if (!dsClasses.has(c) && !localClasses.has(c)) report("M102", "error", rel(file), line, `Class "${c}" exists neither in ${topic.ds} nor in the topic CSS.`, `Use a component from ${topic.ds}/catalog/ or define .${c} in screens.css.`);
      const comp = components.find((x) => x.class === c);
      if (comp) usedComponents.add(comp.id);
    }
    const variant = (tag[0].match(/\sdata-variant="([^"]*)"/) || [])[1];
    if (variant) {
      const owner = cls.find((c) => dsVariants.has(c));
      if (!owner) report("M103", "error", rel(file), line, `data-variant="${variant}" on an element without a design system component.`, "Put data-variant on the component root (e.g. .btn).");
      else if (!dsVariants.get(owner).has(variant)) report("M103", "error", rel(file), line, `.${owner} has no variant "${variant}".`, `Use one of: ${[...dsVariants.get(owner)].join(", ")}, or none for the default.`);
    }
  }
  if (/\sdata-icon="/.test(text) && topic.ds && !loads(file, text).includes(join(dsDir, "ds.js"))) {
    report("M107", "error", rel(file), 1, "Uses data-icon without loading ds.js: icons stay empty.", `Add <script src="${dsFile("ds.js")}"></script> before </body>.`);
  }
  if (/\bd3\./.test(text) && !/<script[^>]+src="[^"]*d3[@.][^"]*"/.test(text)) {
    report("M108", "error", rel(file), 1, "Uses d3 without loading it.", 'Add <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script> before the chart script.');
  }
  // Every declared state beyond the first needs a hook in the screen or its CSS.
  const sources = text + localCss.map((c) => c.text).join("\n");
  for (const state of (screen.states || []).slice(1).map((st) => st.name || String(st))) {
    const id = stateId(state);
    if (!sources.includes(`"${id}"`)) report("M202", "error", rel(file), 1, `State "${state}" is declared but never rendered.`, `Style [data-state="${id}"] in screens.css, or use data-when="${id}" / a script branch on "${id}".`);
  }
}

// A flow answers one user story: a name, the story itself, then the steps that tell it.
// Steps name a screen id, optionally with a state id: "add-loan" or "add-loan:error".
for (const [i, flow] of (topic.flows || []).entries()) {
  const label = `flows[${i}]${flow.name ? ` "${flow.name}"` : ""}`;
  if (!flow.name || !flow.statement) report("M207", "error", "topic.json", 1, `${label}: a flow needs a "name" and the user story it answers in "statement".`, 'Add "name": "Lend an item" and "statement": "As a lender, I want …, so that …".');
  for (const step of flow.steps || []) {
    const [id, stateKey] = step.split(":");
    const s = (topic.screens || []).find((x) => x.id === id);
    const where = `flows[${i}]${flow.name ? ` "${flow.name}"` : ""}`;
    if (!s) report("M205", "error", "topic.json", 1, `${where}: step "${step}" names no screen.`, `Use a screen id: ${(topic.screens || []).map((x) => x.id).join(", ")}.`);
    else if (stateKey && !(s.states || []).some((st) => stateId(st.name || String(st)) === stateKey)) report("M205", "error", "topic.json", 1, `${where}: screen "${id}" has no state "${stateKey}".`, `Use one of: ${(s.states || []).map((st) => stateId(st.name || String(st))).join(", ") || "no state, drop the suffix"}.`);
  }
}

// In a topic with flows, a state no flow reaches is only seen in View → All states. A step without a state is the first one.
if (topic.flows?.length) {
  const steps = topic.flows.flatMap((flow) => flow.steps || []).map((step) => step.split(":"));
  for (const s of topic.screens || []) {
    for (const [i, st] of (s.states || []).entries()) {
      const name = st.name || String(st);
      if (!steps.some(([id, key]) => id === s.id && (key ? key === stateId(name) : i === 0))) report("M210", "warning", "topic.json", 1, `State "${name}" of screen "${s.id}" is in no flow.`, `Add "${s.id}:${stateId(name)}" to a flow, or keep it for View → All states.`);
    }
  }
}

// A UX deliverable: a working document of the topic (ranking sheet, study), listed under the flows, not a screen.
for (const [i, d] of (topic.deliverables || []).entries()) {
  const label = `deliverables[${i}]${d.name ? ` "${d.name}"` : ""}`;
  if (!d.name || !d.file) report("M209", "error", "topic.json", 1, `${label}: a deliverable needs a "name" and a "file".`, 'Add "name": "Priorities" and "file": "screens/priorities.html".');
  else if (!existsSync(join(topicDir, d.file))) report("M208", "error", "topic.json", 1, `${label}: file "${d.file}" does not exist.`, "Point to a file of the topic folder.");
}

const declared = new Set(topic.components || []);
for (const id of declared) {
  if (!components.some((c) => c.id === id)) report("M203", "error", "topic.json", 1, `Component "${id}" is not in ${topic.ds}.`, `Use one of: ${components.map((c) => c.id).join(", ")}.`);
  else if (!usedComponents.has(id)) report("M204", "warning", "topic.json", 1, `Component "${id}" is listed but no screen uses it.`, "Remove it from components.");
}
for (const id of usedComponents) {
  if (!declared.has(id)) report("M204", "warning", "topic.json", 1, `Screens use "${id}" but components does not list it.`, `Add "${id}" to components so the topic page links its playground.`);
}

// --- Output ------------------------------------------------------------------------------------
const shown = onlyScreen ? findings.filter((f) => f.file === rel(join(topicDir, onlyScreen.file))) : findings;
for (const f of shown) console.log(`${f.code} ${f.level} ${f.file}:${f.line} ${f.message} -> ${f.fix}`);
const errors = shown.filter((f) => f.level === "error").length;
console.log(`${relative(ROOT, topicDir)}${onlyScreen ? ` · ${onlyScreen.id} only` : ""}: ${errors} error(s), ${shown.length - errors} warning(s)`);
process.exit(errors ? 1 : 0);
