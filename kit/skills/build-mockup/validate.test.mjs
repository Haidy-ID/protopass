// Run: node --test kit/skills/build-mockup/
// Each bypass is written into a throwaway topic. The validator must name it, and must leave legitimate code alone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));

function codes({ html = "", css = "", js = "", nested = "", ds = "Minimaly" }) {
  const dir = mkdtempSync(join(tmpdir(), "protopass-"));
  const write = (name, text) => {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  };
  write("topic.json", JSON.stringify({ title: "T", ds, screens: [{ id: "a", file: "screens/a.html" }] }));
  write("screens/a.html", `<!doctype html><link rel="stylesheet" href="s.css"><body>${html}<script src="s.js"></script></body>`);
  write("screens/s.css", css);
  write("screens/s.js", js);
  if (nested) write("screens/part/n.css", nested);
  const run = spawnSync(process.execPath, [join(HERE, "validate.mjs"), resolve(dir)], { encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  return run.stdout.split("\n").map((l) => l.split(" ")[0]);
}

const bypasses = {
  M101: {
    "hex in style": { html: `<div style="color:#ff0000">x</div>` },
    "style in single quotes": { html: `<div style='color:#ff0000'>x</div>` },
    "named color in style": { html: `<div style="color:red">x</div>` },
    "named color in a border": { html: `<div style="border:1px solid tomato">x</div>` },
    "named color in a gradient": { css: `.a { background: linear-gradient(red, blue); }` },
    "oklch": { html: `<div style="color:oklch(60% .2 20)">x</div>` },
    "lab": { css: `.a { color: lab(50% 40 59); }` },
    "lch": { css: `.a { color: lch(50% 40 59); }` },
    "oklab": { css: `.a { color: oklab(60% .1 .1); }` },
    "hwb": { css: `.a { color: hwb(194 0% 0%); }` },
    "color()": { css: `.a { color: color(display-p3 1 0 0); }` },
    "named in style block": { html: `<style>.a { background: rebeccapurple; }</style>` },
    "local custom property": { css: `.a { --mine: #ff0000; color: var(--mine); }` },
    "named local custom property": { css: `.a { --mine: tomato; color: var(--mine); }` },
    "rule holding a nested rule": { css: `.a { color: red; .b { margin: 0; } }` },
    "css in a subfolder": { nested: `.a { color: red; }` },
    "data uri": { css: `.a { background: url("data:image/svg+xml;utf8,<svg><rect fill='%23ff0000'/></svg>"); }` },
    "svg fill hex": { html: `<svg><rect fill="#00ff00"/></svg>` },
    "svg fill named": { html: `<svg><rect fill="red"/></svg>` },
    "svg stroke in single quotes": { html: `<svg><rect stroke='#00ff00'/></svg>` },
    "svg stop-color": { html: `<svg><stop stop-color="oklch(60% .2 20)"/></svg>` },
    "font color": { html: `<font color="red">x</font>` },
    "bgcolor": { html: `<td bgcolor="#123456">x</td>` },
    "inline handler": { html: `<div onclick="this.style.color='tomato'">x</div>` },
    "script style property": { js: `document.body.style.color = "tomato";` },
    "inline script": { html: `<script>document.body.style.color = "tomato";</script>` },
    "script ternary": { js: `el.style.color = ok ? "green" : "red";` },
    "script setProperty": { js: `el.style.setProperty("color", "tomato");` },
    "script cssText": { js: `el.style.cssText = "border: 1px solid tomato";` },
    "script d3 attr": { js: `sel.attr("fill", "steelblue");` },
    "script canvas": { js: `ctx.fillStyle = "#ff0000";` },
    "script palette": { js: `const palette = ["tomato", "gold"];` },
    "script hsl": { js: "el.style.color = `hsl(${h} 50% 50%)`;" },
    "script number": { js: `new THREE.Color(0xff0000);` },
    "script template markup": { js: 'el.innerHTML = `<div style="color:tomato">x</div>`;' },
  },
  M113: {
    "all reset": { html: `<button class="btn" style="all:unset">x</button>` },
    "all reset in css": { css: `.a { all: revert; }` },
    "all reset in a script": { js: `el.style.cssText = "all: unset";` },
    "button without a class": { html: `<button>x</button>` },
    "div acting as a button": { html: `<div role="button">x</div>` },
    "button in a script": { js: 'el.innerHTML = `<button>x</button>`;' },
  },
  M114: {
    "button with a local class": { html: `<button class="mine">x</button>`, css: `.mine { margin: 0; }` },
    "button in single quotes": { html: `<button class='mine'>x</button>`, css: `.mine { margin: 0; }` },
    "button with a local class in a script": { js: 'el.innerHTML = `<button class="mine">x</button>`;', css: `.mine { margin: 0; }` },
  },
  M102: {
    "class in single quotes": { html: `<div class='made-up'>x</div>` },
  },
};

for (const [code, cases] of Object.entries(bypasses)) {
  for (const [name, source] of Object.entries(cases)) {
    test(`${code}: ${name}`, () => assert.ok(codes(source).includes(code)));
  }
}

const legitimate = {
  "tokens": { css: `.a { color: var(--color-text-primary); background: transparent; border-color: currentColor; }` },
  "a color word outside a color": { css: `.a { font-family: "Tan Sans"; animation-name: red; grid-area: tan; }` },
  "an id fragment": { html: `<svg><rect fill="url(#abc)"/></svg>` },
  "a url holding a color word": { css: `.a { background: url(images/red.png); }` },
  "an html comment": { html: `<!-- <div style="color:red"> -->` },
  "a css comment": { css: `/* color: red */ .a { margin: 0; }` },
  "a script comment": { js: `// el.style.color = "tomato"\n/* #ff0000 */` },
  "a selector in a script": { js: `document.querySelector("#add"); el.closest("#face");` },
  "a url in a script": { js: `fetch("https://example.com/#abc");` },
  "a word in text": { html: `<p>A red fox, color: unknown.</p>` },
  "a written reason": { html: `<div style="color:red"> <!-- allow-primitive: brand logo --></div>` },
  "a design system button": { html: `<button class="btn">x</button>` },
  "a number stepper": { html: `<label class="input"><span class="input__stepper"><button type="button" data-step="up"></button></span></label>` },
  "a sortable header": { html: `<table class="table"><tr><th><button>Name</button></th></tr></table>` },
  "a class built in a script": { js: 'el.innerHTML = `<button class="${name}">x</button>`;' },
};

for (const [name, source] of Object.entries(legitimate)) {
  test(`legitimate: ${name}`, () => {
    const found = codes(source);
    assert.ok(!["M101", "M113", "M114"].some((c) => found.includes(c)), found.join(" "));
  });
}

test("a topic without ds is checked against Minimaly", () => {
  const found = codes({ ds: undefined, html: `<div class="not-a-class">x</div>` });
  assert.ok(found.includes("M102"), found.join(" "));
});
