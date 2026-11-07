// Reads a design system's token CSS: what a role is, what a primitive is, their values in each theme, the safe pairs.
// No Node and no DOM: validate.mjs and contract.mjs use it, and so does the playground's Tokens page.
// A role is declared in a theme block (:root[data-theme…]). A primitive is a raw color declared outside of one.
// A role's usage is the comment at the end of its line in the light block.
const AA = 4.5;
const LARGE = 3;
const RAW_COLOR = /^(#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\()/i;

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const withoutMedia = (css) => css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
const props = (body) => [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]);

export function readTokens(css) {
  const base = new Map(), light = new Map(), dark = new Map();
  const usage = new Map();
  for (const m of css.matchAll(/^\s*(--[\w-]+)\s*:[^;\n]+;[ \t]*\/\*\s*(.+?)\s*\*\/[ \t]*$/gm)) if (!usage.has(m[1])) usage.set(m[1], m[2]);
  for (const m of withoutMedia(stripComments(css)).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const themes = new Set();
    for (const sel of m[1].split(",")) {
      const attr = sel.match(/\[data-theme(?:="(\w+)")?\]/);
      if (attr?.[1]) themes.add(attr[1]);
      else if (attr) { themes.add("light"); themes.add("dark"); }
    }
    const targets = themes.size ? [...themes].map((t) => ({ light, dark }[t])).filter(Boolean) : [base];
    for (const [name, value] of props(m[2])) for (const t of targets) t.set(name, value);
  }
  const roleNames = [...new Set([...light.keys(), ...dark.keys()])];
  const primitives = new Set([...base].filter(([n, v]) => !light.has(n) && !dark.has(n) && RAW_COLOR.test(v)).map(([n]) => n));
  const resolve = (theme, name, depth = 0) => {
    const value = theme.get(name) ?? base.get(name);
    if (value === undefined || depth > 8) return null;
    return substitute(theme, value, depth);
  };
  const substitute = (theme, value, depth) => value.replace(/var\((--[\w-]+)(?:\s*,[^()]*)?\)/g, (m, n) => resolve(theme, n, depth + 1) ?? m);
  const roles = roleNames.map((name) => ({ name, usage: usage.get(name) || "", light: resolve(light, name), dark: resolve(dark, name) }));
  const others = new Map([...base].filter(([n]) => !primitives.has(n)));
  return { primitives, roles, others, names: new Set([...base.keys(), ...roleNames]), pairs: safePairs(roles) };
}

// #hex, rgb(), and color-mix(in srgb, <color> N%, transparent): what token files hold. Anything else is unknown.
export function parseColor(text) {
  if (!text) return null;
  const mix = text.match(/^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*transparent\)$/);
  if (mix) {
    const c = parseColor(mix[1]);
    return c && { ...c, a: c.a * (mix[2] / 100) };
  }
  const hex = text.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const h = hex[1].length < 6 ? [...hex[1]].map((x) => x + x).join("") : hex[1];
    const [r, g, b, a = 255] = h.match(/../g).map((x) => parseInt(x, 16));
    return { r, g, b, a: a / 255 };
  }
  const rgb = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/);
  return rgb ? { r: +rgb[1], g: +rgb[2], b: +rgb[3], a: rgb[4] === undefined ? 1 : +rgb[4] } : null;
}

const over = (c, bg) => ({ r: c.r * c.a + bg.r * (1 - c.a), g: c.g * c.a + bg.g * (1 - c.a), b: c.b * c.a + bg.b * (1 - c.a), a: 1 });
const luminance = ({ r, g, b }) => {
  const [x, y, z] = [r, g, b].map((v) => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * x + 0.7152 * y + 0.0722 * z;
};
export function contrast(fg, bg) {
  const [a, b] = [luminance(over(fg, bg)), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// Every text-like role against every fill: the lowest ratio across both themes decides.
const isFill = (n) => /surface|subtle|-ink$|-accent$/.test(n) && !/on-/.test(n);
const isInk = (n) => /text|on-|-ink$|-accent$|-agent$|status-[a-z]+$/.test(n) && !/subtle|border/.test(n);
function safePairs(roles) {
  const page = roles.find((r) => r.name.endsWith("surface"));
  const ratio = (fg, bg, theme) => {
    const canvas = parseColor(page?.[theme]) || { r: 255, g: 255, b: 255, a: 1 };
    const [f, b] = [parseColor(fg[theme]), parseColor(bg[theme])];
    return f && b ? contrast(f, over(b, canvas)) : null;
  };
  return roles.filter((r) => isInk(r.name)).map((fg) => {
    const scored = roles.filter((bg) => isFill(bg.name) && bg.name !== fg.name).map((bg) => {
      const both = [ratio(fg, bg, "light"), ratio(fg, bg, "dark")].filter((v) => v !== null);
      return { name: bg.name, min: both.length ? Math.min(...both) : 0 };
    });
    return { name: fg.name, safe: scored.filter((s) => s.min >= AA).map((s) => s.name), large: scored.filter((s) => s.min >= LARGE && s.min < AA).map((s) => s.name) };
  });
}
