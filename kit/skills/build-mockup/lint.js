// Render linter: runs inside a loaded screen document and returns findings on the real geometry.
// lintDocument(doc, { acceptContrast }) -> [{ code, level, target, message, fix, rect }]
// acceptContrast: text or surface colors the design system keeps below the threshold on purpose; their findings get level "accepted".
(() => {
  const MIN_TARGET = 32;
  const INTERACTIVE = 'a[href], button, [role="button"], select, textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])';
  const SKIP = new Set(["SCRIPT", "STYLE", "BR", "TITLE", "META", "LINK", "HEAD", "HTML", "svg", "path", "circle", "rect", "g", "line", "polyline", "polygon"]);

  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a);
    const mix = (k) => (a ? (top[k] * top.a + under[k] * under.a * (1 - top.a)) / a : 0);
    return { r: mix("r"), g: mix("g"), b: mix("b"), a };
  };
  const luminance = ({ r, g, b }) => {
    const ch = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  };
  const ratio = (x, y) => {
    const [a, b] = [luminance(x), luminance(y)].sort((p, q) => q - p);
    return (a + 0.05) / (b + 0.05);
  };

  const hex = ({ r, g, b }) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

  function lintDocument(doc, rules = {}) {
    const accepted = new Map((rules.acceptContrast || []).map((a) => [a.color.toUpperCase(), a.reason]));
    const win = doc.defaultView;
    const vw = doc.documentElement.clientWidth;
    const findings = [];
    const style = (el) => win.getComputedStyle(el);
    const visible = (el) => {
      if (!el.getClientRects().length) return false;
      const s = style(el);
      return s.visibility !== "hidden" && Number(s.opacity) > 0;
    };
    const describe = (el) => {
      const cls = [...el.classList].slice(0, 2).map((c) => `.${c}`).join("");
      const text = (el.textContent || el.value || "").trim().replace(/\s+/g, " ").slice(0, 32);
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls}${text ? ` "${text}"` : ""}`;
    };
    const add = (code, level, el, message, fix) => {
      const r = el.getBoundingClientRect();
      findings.push({ code, level, target: describe(el), message, fix, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, el });
    };
    const disabled = (el) => !!el.closest(':disabled, [aria-disabled="true"]');
    const faded = (el) => {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (Number(style(n).opacity) < 1) return true;
      return false;
    };
    // Background actually painted behind an element: ancestors composited up to an opaque one, canvas white.
    const backdrop = (el) => {
      const layers = [];
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const s = style(n);
        if (s.backgroundImage !== "none") return null;
        const c = parse(s.backgroundColor);
        if (c && c.a > 0) layers.push(c);
        if (c && c.a === 1) break;
      }
      return layers.reverse().reduce((under, top) => over(top, under), { r: 255, g: 255, b: 255, a: 1 });
    };
    const scrolledIn = (el) => {
      for (let n = el.parentElement; n && n !== doc.body; n = n.parentElement) if (["auto", "scroll", "hidden", "clip"].includes(style(n).overflowX)) return true;
      return false;
    };
    const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

    const all = [...doc.body.querySelectorAll("*")].filter((el) => !SKIP.has(el.tagName) && !el.closest("svg"));

    for (const el of all) {
      if (!visible(el)) continue;
      const s = style(el);
      const r = el.getBoundingClientRect();

      // L101 contrast
      const isField = el.matches("input:not([type=checkbox]):not([type=radio]), textarea") && el.value;
      if ((ownText(el) || isField) && !disabled(el) && !faded(el)) {
        const fg = parse(s.color);
        const bg = backdrop(el);
        if (fg && bg) {
          const size = parseFloat(s.fontSize);
          const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
          // A lone symbol (✓, ×, →) is an icon: WCAG non-text contrast, 3:1.
          const glyph = /^[^\p{L}\p{N}]$/u.test(el.textContent.trim());
          const min = large || glyph ? 3 : 4.5;
          const value = ratio(over(fg, bg), bg);
          if (value < min) {
            const reason = accepted.get(hex(fg)) || accepted.get(hex(bg));
            add("L101", reason ? "accepted" : "error", el, `Contrast ${value.toFixed(2)}:1, needs ${min}:1.${reason ? ` Accepted: ${reason}` : ""}`, reason ? "None, accepted by the design system (lint.json)." : "Pick the text color token meant for this surface, or change the surface.");
          }
        }
      }

      // L201 collapsed: has content but no area, reported on the outermost collapsed element only
      const flat = (n) => { const b = n.getBoundingClientRect(); return b.width < 1 || b.height < 1; };
      if (flat(el) && s.display !== "contents" && (el.textContent.trim() || el.children.length) && !(el.parentElement !== doc.body && flat(el.parentElement))) {
        add("L201", "error", el, `Collapsed to ${Math.round(r.width)}×${Math.round(r.height)} px while it has content.`, "Check flex/grid sizing, width, height and overflow on it and its parent.");
      }

      // L202 horizontal overflow of the viewport, reported on the outermost element only.
      // Content inside a box that scrolls or clips sideways (a wide table) stays inside that box: not an overflow.
      if ((r.right > vw + 1 || r.left < -1) && !scrolledIn(el) && !(el.parentElement && el.parentElement !== doc.body && (() => {
        const p = el.parentElement.getBoundingClientRect();
        return p.right > vw + 1 || p.left < -1;
      })())) {
        add("L202", "error", el, `Goes ${Math.round(Math.max(r.right - vw, -r.left))} px outside the ${vw} px viewport.`, "Allow wrapping, shrink it (min-width: 0) or reduce its content.");
      }

      // L203 clipped text
      if (ownText(el) && ["hidden", "clip"].includes(s.overflowX) && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== "ellipsis") {
        add("L203", "warning", el, "Text is cut off without an ellipsis.", "Let it wrap, or add text-overflow: ellipsis on purpose.");
      }

      // L401 target size. A field inside a <label> is clicked through the label: the label is the target.
      const target = el.matches(INTERACTIVE) ? el.closest("label")?.getBoundingClientRect() || r : null;
      // A link inside running text (a word, a citation number) is sized by the text, like any link in a paragraph.
      const inText = el.matches("a[href]") && s.display.startsWith("inline") && [...(el.parentElement?.childNodes || [])].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (target && !inText && target.height < MIN_TARGET - 0.5) {
        add("L401", "error", el, `Clickable element is ${Math.round(target.height)} px high, minimum ${MIN_TARGET} px.`, "Use a design system control (32 px) or raise its height to var(--control-height).");
      }

      // L402 non-clickable label that looks like a button: own fill, rounded, short text
      if (!el.matches(INTERACTIVE) && !el.closest(INTERACTIVE) && ownText(el) && el.textContent.trim().length <= 24) {
        const fill = parse(s.backgroundColor);
        const parentBg = el.parentElement && backdrop(el.parentElement);
        const filled = fill && fill.a > 0.5 && parentBg && ratio(over(fill, parentBg), parentBg) > 1.3;
        if (filled && parseFloat(s.borderTopLeftRadius) > 0 && r.height < MIN_TARGET) {
          add("L402", "warning", el, "Filled, rounded and short: reads as a button but is not clickable.", "Drop the fill (text color only) or make it a real 32 px control.");
        }
      }
    }

    // L301 overlap between in-flow siblings
    for (const parent of [doc.body, ...all]) {
      const kids = [...parent.children].filter((k) => !SKIP.has(k.tagName) && visible(k) && ["static", "relative"].includes(style(k).position));
      for (let i = 0; i < kids.length; i++) {
        for (let j = i + 1; j < kids.length; j++) {
          const a = kids[i].getBoundingClientRect();
          const b = kids[j].getBoundingClientRect();
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w > 2 && h > 2) add("L301", "error", kids[j], `Overlaps ${describe(kids[i])} by ${Math.round(w)}×${Math.round(h)} px.`, "Check negative margins, fixed heights and absolute children in the parent.");
        }
      }
    }
    return findings;
  }

  window.lintDocument = lintDocument;
})();
