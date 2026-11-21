// Zero-dependency WAI-ARIA & keyboard pattern checker for Protopass specimens.
// Attaches window.checkPattern(doc, pattern) -> Promise<string[]> (empty = pass).
// Rules adapted from WAI-ARIA APG and vercel-labs/ui (Apache-2.0).
(() => {
  "use strict";

  const FOCUSABLE =
    "a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]:not([contenteditable=false])";

  const REF_ATTRS = [
    "aria-controls",
    "aria-labelledby",
    "aria-describedby",
    "aria-activedescendant",
    "aria-owns",
  ];

  const NAMED_BY_CONTENT = new Set([
    "button",
    "cell",
    "checkbox",
    "columnheader",
    "gridcell",
    "heading",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "row",
    "rowheader",
    "switch",
    "tab",
    "treeitem",
  ]);

  const WIDGET_ROLES = new Set([
    "button",
    "checkbox",
    "combobox",
    "gridcell",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "slider",
    "switch",
    "tab",
    "textbox",
    "treeitem",
  ]);

  const DEFAULT_ORIENTATION = {
    listbox: "vertical",
    menu: "vertical",
    menubar: "horizontal",
    scrollbar: "vertical",
    slider: "horizontal",
    tablist: "horizontal",
    toolbar: "horizontal",
    tree: "vertical",
  };

  const MENU_ITEM_ROLES = ["menuitem", "menuitemcheckbox", "menuitemradio"];

  // Sentinel to abort further key presses once focus is lost to body.
  const STOPPED = Symbol("stopped");

  // --- DOM & ARIA helpers (always cross-realm safe via doc.defaultView) ---

  function isStaticPreview(el) {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      if (node.hasAttribute("data-static-preview")) return true;
      const inline = node.getAttribute("style");
      if (inline && /(?:^|;)\s*position\s*:\s*static\b/i.test(inline)) return true;
    }
    return false;
  }

  function isGone(el) {
    if (!el || !el.isConnected) return true;
    if (el.closest("[hidden], [inert]")) return true;
    const closedDialog = el.closest("dialog:not([open])");
    if (closedDialog) return true;
    const closedDetails = el.closest("details:not([open])");
    if (closedDetails) {
      const summary = closedDetails.querySelector(":scope > summary");
      if (!summary || (el !== summary && !summary.contains(el))) return true;
    }
    return false;
  }

  function isUnreachable(el) {
    return !!el?.closest('[aria-hidden="true"], [inert]');
  }

  function isDisabled(el) {
    if (!el) return false;
    return (
      el.matches(":disabled") ||
      el.getAttribute("aria-disabled") === "true" ||
      !!el.closest('[aria-disabled="true"], fieldset:disabled')
    );
  }

  function isReadOnly(el) {
    return el?.getAttribute("aria-readonly") === "true";
  }

  function renderedParent(el) {
    return (
      el.assignedSlot ??
      el.parentElement ??
      (el.parentNode && el.parentNode.host ? el.parentNode.host : null)
    );
  }

  function isUndisplayed(el, win, known = new Map()) {
    if (!el || el.nodeType !== 1) return false;
    let hidden = known.get(el);
    if (hidden === undefined) {
      const display = win.getComputedStyle(el).display;
      hidden = display === "none" || isUndisplayed(renderedParent(el), win, known);
      known.set(el, hidden);
    }
    return hidden;
  }

  function isShown(el, win) {
    return (
      !!el &&
      !isGone(el) &&
      !isUndisplayed(el, win) &&
      win.getComputedStyle(el).visibility !== "hidden"
    );
  }

  function implicitRole(el, win) {
    if (el.matches("button")) return "button";
    if (el.matches("a[href]")) return "link";
    if (el.matches("input[type=checkbox][switch]")) return "switch";
    if (el.matches("input[type=checkbox]")) return "checkbox";
    if (el.matches("input[type=radio]")) return "radio";
    if (el.matches("input[type=range]")) return "slider";
    if (el instanceof win.HTMLSelectElement) {
      return el.multiple || el.size > 1 ? "listbox" : "combobox";
    }
    if (el.matches("dialog")) return "dialog";
    if (el.matches("nav")) return "navigation";
    if (el.matches("h1, h2, h3, h4, h5, h6")) return "heading";
    if (el.matches("summary") && el.parentElement?.matches("details")) return "button";
    if (el.matches("table")) return "table";
    if (el.matches("tr")) return "row";
    if (el.matches("th")) return "columnheader";
    if (el.matches("td")) return "cell";
    return "";
  }

  function roleOf(el, win) {
    if (!el || el.nodeType !== 1) return "";
    const explicit = el.getAttribute("role")?.trim().split(/\s+/)[0];
    if (explicit) {
      if (explicit === "none" || explicit === "presentation") return "";
      return explicit;
    }
    return implicitRole(el, win);
  }

  function byId(el, id) {
    if (!id) return null;
    const root = el.getRootNode();
    return typeof root.getElementById === "function" ? root.getElementById(id) : null;
  }

  function ids(el, attr) {
    return (el.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean);
  }

  function collapse(text) {
    return String(text ?? "").replace(/\s+/g, " ").trim();
  }

  function isHiddenForName(el, win) {
    if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") return true;
    const style = win.getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
  }

  function embeddedName(el) {
    if (el.localName === "img") return el.getAttribute("alt") ?? "";
    if (el.localName === "svg") {
      return [...el.children].find((c) => c.localName === "title")?.textContent ?? "";
    }
    return "";
  }

  function labelledByOf(el, win) {
    return ids(el, "aria-labelledby")
      .map((id) => byId(el, id))
      .filter(Boolean)
      .map((label) => label.getAttribute("aria-label") ?? contentOf(label, win, true))
      .join(" ");
  }

  function nameWithin(el, win, labelling, hidden) {
    if (el.matches("input, select, textarea")) return "";
    const own =
      (!labelling && labelledByOf(el, win)) ||
      el.getAttribute("aria-label")?.trim() ||
      embeddedName(el);
    if (own) return ` ${own} `;
    if (el.localName === "svg") return "";
    const content = contentOf(el, win, labelling, hidden);
    const title = el.getAttribute("title");
    return content || (title ? ` ${title} ` : "");
  }

  function contentOf(el, win, labelling = false, hidden = isHiddenForName(el, win)) {
    let text = "";
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        text += node.nodeValue;
      } else if (node.nodeType === 1 && (hidden || !isHiddenForName(node, win))) {
        text += nameWithin(node, win, labelling, hidden);
      }
    }
    return text;
  }

  function labelsOf(el, win) {
    if (!("labels" in el) || !el.labels) return "";
    return [...el.labels].map((label) => contentOf(label, win)).join(" ");
  }

  function accessibleName(el, win) {
    if (!el) return "";
    const sources = [
      () => labelledByOf(el, win),
      () => el.getAttribute("aria-label") ?? "",
      () => labelsOf(el, win),
      () => embeddedName(el),
      () => (NAMED_BY_CONTENT.has(roleOf(el, win)) ? contentOf(el, win) : ""),
      () => el.getAttribute("title") ?? "",
    ];
    for (const source of sources) {
      const name = collapse(source());
      if (name) return name;
    }
    return "";
  }

  function hasBoolean(el, attr) {
    const val = el.getAttribute(attr);
    return val === "true" || val === "false";
  }

  function checkedOf(el, win) {
    if (el instanceof win.HTMLInputElement && !el.hasAttribute("aria-checked")) {
      if (el.type === "checkbox" && el.indeterminate) return "mixed";
      return String(el.checked);
    }
    return el.getAttribute("aria-checked") ?? "";
  }

  function isRtl(el, win) {
    const dir = el.closest("[dir]")?.getAttribute("dir")?.toLowerCase();
    if (dir === "rtl" || dir === "ltr") return dir === "rtl";
    return win.getComputedStyle(el).direction === "rtl";
  }

  function withRole(scope, roles, win, { displayed = true, skipStatic = true } = {}) {
    const known = new Map();
    return [...scope.querySelectorAll("*")].filter(
      (el) =>
        roles.includes(roleOf(el, win)) &&
        (!skipStatic || !isStaticPreview(el)) &&
        !isGone(el) &&
        !isUnreachable(el) &&
        (!displayed || !isUndisplayed(el, win, known)),
    );
  }

  function isTabStop(el, win, known) {
    if (!el.matches(FOCUSABLE) || isGone(el)) return false;
    if (el.tabIndex < 0 || el.matches(":disabled")) return false;
    if (el instanceof win.HTMLInputElement && el.type === "hidden") return false;
    if (isUndisplayed(el, win, known) || win.getComputedStyle(el).visibility === "hidden") return false;
    // Native radios sharing a name form a single tab stop: the checked one, else the first.
    if (el instanceof win.HTMLInputElement && el.type === "radio" && el.name) {
      const group = [...el.ownerDocument.querySelectorAll("input[type=radio]")].filter(
        (r) =>
          r.name === el.name &&
          r.form === el.form &&
          !r.matches(":disabled") &&
          !isGone(r) &&
          !isUndisplayed(r, win, known),
      );
      return el === (group.find((r) => r.checked) ?? group[0]);
    }
    return true;
  }

  function tabStops(scope, win) {
    const known = new Map();
    const candidates = scope.nodeType === 1 ? [scope, ...scope.querySelectorAll(FOCUSABLE)] : [...scope.querySelectorAll(FOCUSABLE)];
    return candidates.filter((el) => isTabStop(el, win, known));
  }

  function focusables(scope, win) {
    const known = new Map();
    return [...scope.querySelectorAll(FOCUSABLE)].filter(
      (el) =>
        !isGone(el) &&
        !el.matches(":disabled") &&
        !(el instanceof win.HTMLInputElement && el.type === "hidden") &&
        !isUndisplayed(el, win, known) &&
        win.getComputedStyle(el).visibility !== "hidden",
    );
  }

  function describe(el, win) {
    if (!el) return "nothing";
    if (el === el.ownerDocument?.body) return "body";
    const role = el.getAttribute("role");
    const tag = el.tagName.toLowerCase();
    const sel = `${tag}${el.id ? `#${el.id}` : ""}${role ? `[role=${role}]` : ""}`;
    if (el.id || (el.children.length && !NAMED_BY_CONTENT.has(roleOf(el, win)))) return sel;
    const text = collapse(el.textContent).slice(0, 24);
    return text ? `${sel} "${text}"` : sel;
  }

  function danglingReferences(scope) {
    const bad = [];
    const nodes = scope.nodeType === 1 ? [scope, ...scope.querySelectorAll("*")] : [...scope.querySelectorAll("*")];
    for (const el of nodes) {
      if (isGone(el) || isStaticPreview(el)) continue;
      for (const attr of REF_ATTRS) {
        if (attr === "aria-controls" && el.getAttribute("aria-expanded") === "false") continue;
        for (const id of ids(el, attr)) {
          if (!byId(el, id)) bad.push({ el, attr, id });
        }
      }
    }
    return bad;
  }

  // --- Event & Keyboard Simulation ---

  async function settle(win) {
    await Promise.resolve();
    await new Promise((r) => win.setTimeout(r, 0));
    await new Promise((r) => win.requestAnimationFrame(r));
  }

  function parseKey(name) {
    const parts = name.split("+");
    const raw = parts.pop();
    const held = new Set(parts.map((p) => p.toLowerCase()));
    return {
      key: raw === "Space" ? " " : raw,
      shiftKey: held.has("shift"),
      altKey: held.has("alt"),
      ctrlKey: held.has("control") || held.has("ctrl"),
      metaKey: held.has("meta") || held.has("cmd"),
    };
  }

  function codeOf(key) {
    if (key === " ") return "Space";
    if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
    if (/^\d$/.test(key)) return `Digit${key}`;
    return key;
  }

  function isEditable(el, win) {
    if (!el) return false;
    if (el instanceof win.HTMLTextAreaElement) return !el.readOnly && !el.matches(":disabled");
    if (el instanceof win.HTMLInputElement) {
      return (
        !el.readOnly &&
        !el.matches(":disabled") &&
        !/^(button|checkbox|radio|submit|reset|range|color|file|image)$/.test(el.type)
      );
    }
    return !!el.isContentEditable;
  }

  function topModalDialog(doc) {
    const modals = [...doc.querySelectorAll("dialog:modal")].filter((d) => !isStaticPreview(d));
    return modals.at(-1) ?? null;
  }

  function moveTab(doc, win, backward) {
    // A native :modal dialog makes the rest of the document inert and traps Tab within it.
    const modal = topModalDialog(doc);
    const scope = modal ?? doc.body;
    const raw = tabStops(scope, win);
    const positive = raw.filter((el) => el.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex);
    const ordered = [...positive, ...raw.filter((el) => el.tabIndex === 0)];
    if (!ordered.length) return;
    const active = doc.activeElement;
    const index = active ? ordered.indexOf(active) : -1;
    let next;
    if (modal) {
      next = backward
        ? ordered[(index <= 0 ? ordered.length : index) - 1]
        : ordered[(index + 1) % ordered.length];
    } else {
      next = backward
        ? index < 0
          ? ordered.at(-1)
          : ordered[index - 1]
        : ordered[index + 1];
    }
    if (next) next.focus();
    else active?.blur();
  }

  function keyClick(el, win) {
    el.dispatchEvent(
      new win.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: 0,
      }),
    );
  }

  function nativeKey(el, win, key) {
    const inline = isRtl(el, win) ? ["ArrowLeft", "ArrowRight"] : ["ArrowRight", "ArrowLeft"];
    if (el.type === "radio" && el.name) {
      const by = [inline[0], "ArrowDown"].includes(key) ? 1 : [inline[1], "ArrowUp"].includes(key) ? -1 : 0;
      if (!by) return;
      const group = [...el.ownerDocument.querySelectorAll("input[type=radio]")].filter(
        (r) =>
          r === el ||
          (r.name === el.name && r.form === el.form && !r.matches(":disabled") && isShown(r, win)),
      );
      const next = group[(group.indexOf(el) + by + group.length) % group.length];
      if (next && next !== el) {
        next.focus();
        keyClick(next, win);
      }
    } else if (el.type === "range") {
      const min = Number.parseFloat(el.min) || 0;
      const max = el.max === "" ? 100 : Number.parseFloat(el.max);
      const any = el.step.toLowerCase() === "any";
      const step = any ? (max - min) / 100 : Number.parseFloat(el.step) || 1;
      const value = Number.parseFloat(el.value);
      const page = Math.max(step, (max - min) / 10);
      const top = any ? max : min + Math.floor((max - min) / step) * step;
      const target = [inline[0], "ArrowUp"].includes(key)
        ? value + step
        : [inline[1], "ArrowDown"].includes(key)
          ? value - step
          : { PageUp: value + page, PageDown: value - page, Home: min, End: max }[key];
      if (target === undefined) return;
      const snapped = any ? target : min + Math.round((target - min) / step) * step;
      el.value = String(Number.parseFloat(Math.min(top, Math.max(min, snapped)).toPrecision(12)));
      if (Number.parseFloat(el.value) !== value) {
        el.dispatchEvent(new win.Event("input", { bubbles: true, composed: true }));
        el.dispatchEvent(new win.Event("change", { bubbles: true }));
      }
    }
  }

  function activates(el, win, key) {
    if (!el || isDisabled(el)) return false;
    const isSummary = el.matches("summary") && !!el.parentElement?.matches("details");
    if (key === "Enter") {
      return el instanceof win.HTMLButtonElement || el instanceof win.HTMLAnchorElement || isSummary;
    }
    if (key === " ") {
      return (
        el instanceof win.HTMLButtonElement ||
        isSummary ||
        (el instanceof win.HTMLInputElement && /^(checkbox|radio)$/.test(el.type))
      );
    }
    return false;
  }

  // --- Pattern Context ---

  function createContext(doc) {
    const win = doc.defaultView;
    const problems = new Set();
    const watched = new Set([doc.body]);
    const cleanups = [];

    const problem = (el, rule) => {
      problems.add(`${describe(el, win)}: ${rule}`);
    };

    const checkReferences = () => {
      for (const scope of watched) {
        for (const { el, attr, id } of danglingReferences(scope)) {
          problem(
            el,
            `${attr} points at "${id}", which is not in the document (ARIA).`,
          );
        }
      }
    };

    const focus = async (el) => {
      el.focus();
      await settle(win);
      const active = doc.activeElement;
      if (active && active !== doc.body && active !== doc.documentElement) return;
      problem(el, "cannot take focus.");
      throw STOPPED;
    };

    const press = async (keyName, { allowBody = false } = {}) => {
      const init = parseKey(keyName);
      const target = doc.activeElement && doc.activeElement !== doc.documentElement ? doc.activeElement : doc.body;
      const down = new win.KeyboardEvent("keydown", {
        ...init,
        code: codeOf(init.key),
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      const proceeds = target.dispatchEvent(down);
      if (proceeds) {
        if (init.key === "Tab") {
          moveTab(doc, win, init.shiftKey);
        } else if (init.key === "Escape") {
          // Simulate browser default Escape behavior on a native :modal <dialog>.
          const modal = topModalDialog(doc);
          if (modal) {
            const cancel = new win.Event("cancel", { bubbles: false, cancelable: true });
            if (modal.dispatchEvent(cancel)) modal.close();
          }
        } else if (target instanceof win.HTMLInputElement) {
          nativeKey(target, win, init.key);
        }
        if (init.key === "Enter" && activates(target, win, "Enter")) {
          keyClick(target, win);
        }
      }
      const upTarget = doc.activeElement && doc.activeElement !== doc.documentElement ? doc.activeElement : doc.body;
      upTarget.dispatchEvent(
        new win.KeyboardEvent("keyup", {
          ...init,
          code: codeOf(init.key),
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
      if (proceeds && init.key === " " && activates(target, win, " ")) {
        keyClick(target, win);
      }
      await settle(win);
      const after = doc.activeElement;
      if (!allowBody && (!after || after === doc.body || after === doc.documentElement)) {
        problem(
          target,
          `after ${keyName}, focus fell to body (APG: keyboard interface).`,
        );
        throw STOPPED;
      }
      if (after && after !== doc.body && isUnreachable(after)) {
        problem(
          after,
          `after ${keyName}, focus landed inside aria-hidden or inert content.`,
        );
      }
      checkReferences();
    };

    const click = async (el) => {
      if (!isDisabled(el)) el.focus();
      el.dispatchEvent(
        new win.MouseEvent("mousedown", { bubbles: true, cancelable: true, composed: true, detail: 1 }),
      );
      el.dispatchEvent(
        new win.MouseEvent("mouseup", { bubbles: true, cancelable: true, composed: true, detail: 1 }),
      );
      el.dispatchEvent(
        new win.MouseEvent("click", { bubbles: true, cancelable: true, composed: true, detail: 1 }),
      );
      await settle(win);
    };

    const requireName = (el, source) => {
      if (!accessibleName(el, win)) {
        problem(el, `has no accessible name (APG ${source}).`);
      }
    };

    const orientationOf = (el) => {
      const fallback = DEFAULT_ORIENTATION[roleOf(el, win)];
      const aria = el.getAttribute("aria-orientation");
      const data = el.getAttribute("data-orientation");
      const read = aria === "horizontal" || aria === "vertical" ? aria : fallback ?? "vertical";
      if (data && fallback && data !== read) {
        problem(
          el,
          `has data-orientation="${data}" but exposes "${read}" to AT; set aria-orientation="${data}" (ARIA).`,
        );
      }
      return read;
    };

    const arrowsFor = (orientation, rtl) => {
      if (orientation === "vertical") return { next: "ArrowDown", previous: "ArrowUp" };
      return rtl ? { next: "ArrowLeft", previous: "ArrowRight" } : { next: "ArrowRight", previous: "ArrowLeft" };
    };

    const checkOwned = (container, allowed, source) => {
      for (const el of container.querySelectorAll("*")) {
        const role = roleOf(el, win);
        if (!WIDGET_ROLES.has(role) || allowed.includes(role) || isGone(el) || isUnreachable(el)) continue;
        problem(
          el,
          `is a ${role} inside ${roleOf(container)}, which owns only ${allowed.join("/")} elements (APG ${source}).`,
        );
      }
    };

    return {
      doc,
      win,
      problems,
      problem,
      focus,
      press,
      click,
      checkReferences,
      requireName,
      orientationOf,
      arrowsFor,
      checkOwned,
      watch: (el) => el && watched.add(el),
      defer: (fn) => cleanups.push(fn),
      cleanup: async () => {
        for (const fn of cleanups.reverse()) {
          try {
            await fn();
          } catch {
            // Cleanup must never mask collected issues.
          }
        }
      },
    };
  }

  // --- Composite Navigation Helpers ---

  function currentItem(ctx, composite) {
    const active = ctx.doc.activeElement;
    const items = composite.items();
    const descendant = active?.getAttribute("aria-activedescendant");
    if (descendant) return items.find((item) => item.id === descendant);
    if (!active) return undefined;
    return items.find((item) => item === active) ?? items.filter((item) => item.contains(active)).at(-1);
  }

  function scan(items, start, step) {
    const passed = [];
    for (let i = start; i >= 0 && i < items.length; i += step) {
      passed.push(items[i]);
      if (!isDisabled(items[i])) return { passed, reached: true };
    }
    return { passed, reached: false };
  }

  function stepTargets(items, index, forward, wraps) {
    const step = forward ? 1 : -1;
    const ahead = scan(items, index + step, step);
    if (ahead.reached) return ahead.passed;
    const around = scan(items, forward ? 0 : items.length - 1, step).passed;
    const stays = [items[index], ...ahead.passed];
    if (wraps === true) return [...ahead.passed, ...around];
    if (wraps === false) return stays;
    return [...stays, ...around];
  }

  function checkTabStop(ctx, composite, required = true) {
    const { container, noun, source } = composite;
    const stops = tabStops(container, ctx.win);
    if (stops.length > 1) {
      ctx.problem(
        container,
        `has ${stops.length} tab stops (${stops.slice(0, 4).map((s) => describe(s, ctx.win)).join(", ")}); a composite should have at most 1 (APG ${source}).`,
      );
    } else if (!stops.length && required) {
      ctx.problem(
        container,
        `has no tab stop; one ${noun} (or container with aria-activedescendant) must take Tab (APG ${source}).`,
      );
    } else if (stops.length === 1 && container.hasAttribute("aria-activedescendant") && stops[0] !== container) {
      ctx.problem(
        stops[0],
        `takes Tab, but with aria-activedescendant the ${roleOf(container, ctx.win)} itself should be the tab stop (APG ${source}).`,
      );
    }
  }

  async function enterComposite(ctx, composite) {
    const stop = tabStops(composite.container, ctx.win)[0] ?? composite.items().find((i) => !isDisabled(i));
    if (!stop) throw STOPPED;
    await ctx.focus(stop);
    return currentItem(ctx, composite);
  }

  async function expectMove(ctx, composite, key, allowed, expected) {
    const from = currentItem(ctx, composite);
    await ctx.press(key);
    const to = currentItem(ctx, composite);
    if (to && allowed.includes(to)) return to;
    const outcome = !to
      ? `focus went to ${describe(ctx.doc.activeElement, ctx.win)}, outside the ${composite.noun}s`
      : to === from
        ? "focus stayed"
        : `focus went to ${describe(to, ctx.win)}`;
    ctx.problem(
      from ?? composite.container,
      `${key} should move focus to ${expected} (${describe(allowed[0], ctx.win)}), but ${outcome} (APG ${composite.source}).`,
    );
    if (!to) throw STOPPED;
    return to;
  }

  async function expectStep(ctx, composite, key, forward, wraps) {
    const items = composite.items();
    const from = currentItem(ctx, composite);
    const index = from ? items.indexOf(from) : -1;
    const allowed = index < 0 ? scan(items, 0, 1).passed : stepTargets(items, index, forward, wraps);
    const atEnd = index >= 0 && !scan(items, index + (forward ? 1 : -1), forward ? 1 : -1).reached;
    const expected = index < 0 ? `the first ${composite.noun}` : `the ${forward ? "next" : "previous"} ${composite.noun}`;
    return expectMove(ctx, composite, key, allowed, atEnd && wraps ? `${expected} (wrapping)` : expected);
  }

  async function checkNavigation(ctx, composite, moves) {
    const start = currentItem(ctx, composite);
    const items = composite.items();
    if (items.length < 2) return start;
    const step = async (key, forward) => {
      const to = await expectStep(ctx, composite, key, forward, moves.wraps);
      moves.onMove?.(key, to);
    };
    const jump = async (key) => {
      const all = composite.items();
      const allowed = key === "Home" ? scan(all, 0, 1).passed : scan(all, all.length - 1, -1).passed;
      const to = await expectMove(ctx, composite, key, allowed, `the ${key === "Home" ? "first" : "last"} ${composite.noun}`);
      moves.onMove?.(key, to);
    };
    for (const key of moves.next) await step(key, true);
    for (const key of moves.previous) await step(key, false);
    if (moves.homeEnd) {
      // Ensure we are not already on the first item before testing Home, then jump End once for the end-wrap test.
      const firstEnabled = scan(composite.items(), 0, 1).passed.at(-1);
      if (currentItem(ctx, composite) === firstEnabled) await step(moves.next[0], true);
      await jump("Home");
      await jump("End");
    } else {
      for (let guard = items.length; guard > 0; guard--) {
        const all = composite.items();
        const index = all.indexOf(currentItem(ctx, composite));
        if (index < 0 || !scan(all, index + 1, 1).reached) break;
        await step(moves.next[0], true);
      }
    }
    await step(moves.next[0], true);
    await step(moves.previous[0], false);
    return start;
  }

  async function returnTo(ctx, composite, target, arrows) {
    if (!target) return;
    for (let guard = composite.items().length * 2; guard > 0; guard--) {
      const items = composite.items();
      const current = currentItem(ctx, composite);
      if (!current || current === target || !items.includes(target)) return;
      await ctx.press(items.indexOf(target) > items.indexOf(current) ? arrows.next : arrows.previous);
    }
  }

  async function checkTypeahead(ctx, composite, arrows) {
    const items = composite.items();
    const initialOf = (el) => accessibleName(el, ctx.win).charAt(0).toLowerCase();
    const unique = items.filter(
      (item) =>
        !isDisabled(item) &&
        /^[a-z0-9]$/.test(initialOf(item)) &&
        items.filter((other) => !isDisabled(other) && initialOf(other) === initialOf(item)).length === 1,
    );
    const index = items.indexOf(currentItem(ctx, composite));
    if (unique.length === 1 && unique[0] === items[index]) {
      await ctx.press(index < items.length - 1 ? arrows.next : arrows.previous);
    }
    const from = currentItem(ctx, composite);
    const target = unique.find((item) => item !== from);
    if (!target) return;
    const letter = initialOf(target);
    await ctx.press(letter);
    if (currentItem(ctx, composite) === target) return;
    ctx.problem(
      from ?? composite.container,
      `typing "${letter}" should move focus to ${describe(target, ctx.win)} (APG ${composite.source}: type-ahead).`,
    );
  }

  // --- Shared Popup Helpers ---

  const isSelected = (el) =>
    el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-checked") === "true";

  function ownMenuItems(container, win) {
    return withRole(container, MENU_ITEM_ROLES, win).filter(
      (item) => item.parentElement?.closest('[role="menu"], [role="menubar"]') === container,
    );
  }

  function popupOf(el, roles, win) {
    const controlled = ids(el, "aria-controls")
      .map((id) => byId(el, id))
      .find((p) => p && !isStaticPreview(p) && roles.includes(roleOf(p, win)));
    if (controlled) return controlled;
    const dataId = el.dataset?.menu || el.dataset?.submenu || el.dataset?.open;
    if (dataId) {
      const p = byId(el, dataId);
      if (p && !isStaticPreview(p) && roles.includes(roleOf(p, win))) return p;
    }
    return null;
  }

  function isInert(el) {
    for (let node = el; node; node = node.parentElement) {
      if (node.inert === true || node.hasAttribute("inert")) return true;
    }
    return false;
  }

  async function checkModalDialog(ctx, popup, trigger, source) {
    const { doc, win } = ctx;
    ctx.watch(popup);
    ctx.requireName(popup, source);
    const inside = () => popup.contains(doc.activeElement);
    if (!inside()) {
      ctx.problem(
        popup,
        `opened, but focus is on ${describe(doc.activeElement, win)}; opening a dialog must move focus inside it (APG ${source}).`,
      );
      return false;
    }
    const first = doc.activeElement;
    const isNativeModal = popup instanceof win.HTMLDialogElement && popup.matches(":modal");
    const pageInert = isNativeModal || (trigger ? isInert(trigger) : false);
    const stops = tabStops(popup, win).length;
    let trapped = true;
    for (const key of ["Tab", "Shift+Tab"]) {
      const from = doc.activeElement;
      let moved = false;
      for (let step = 0; step <= stops && trapped; step++) {
        await ctx.press(key, { allowBody: true });
        if (!inside()) trapped = false;
        if (doc.activeElement !== from) moved = true;
      }
      if (trapped && !moved && stops > 1) {
        ctx.problem(
          popup,
          `${key} stayed on ${describe(from, win)} instead of cycling across ${stops} tab stops (APG ${source}).`,
        );
      }
    }
    const modal = isNativeModal || pageInert || popup.getAttribute("aria-modal") === "true";
    if (modal && !trapped) {
      ctx.problem(
        popup,
        `is modal, but Tab escaped to ${describe(doc.activeElement, win)} (APG ${source}).`,
      );
    }
    if (modal && !isNativeModal && popup.getAttribute("aria-modal") !== "true") {
      ctx.problem(
        popup,
        `is modal without aria-modal="true" (APG ${source}).`,
      );
    }
    if (!inside() && first) first.focus();
    return true;
  }

  // --- Pattern Implementations ---

  async function checkTabs(ctx) {
    const { doc, win } = ctx;
    const list = withRole(doc.body, ["tablist"], win)[0];
    if (!list) {
      ctx.problem(doc.body, "has no element with role tablist (APG tabs).");
      return;
    }
    ctx.requireName(list, "tabs");
    ctx.checkOwned(list, ["tab"], "tabs");
    const all = withRole(list, ["tab"], win);
    if (!all.length) {
      ctx.problem(list, "owns no tab elements (APG tabs).");
      return;
    }
    for (const tab of all) {
      ctx.requireName(tab, "tabs");
      if (!hasBoolean(tab, "aria-selected")) {
        ctx.problem(tab, 'missing boolean aria-selected ("true" or "false") (APG tabs).');
      }
    }
    const selected = all.filter(isSelected);
    if (selected.length !== 1) {
      ctx.problem(list, `has ${selected.length} selected tabs; exactly 1 should be active (APG tabs).`);
    }
    const checkPanels = (tabs) => {
      for (const tab of tabs) {
        const panels = ids(tab, "aria-controls")
          .map((id) => doc.getElementById(id))
          .filter(Boolean);
        if (isSelected(tab) && !panels.length) {
          ctx.problem(tab, "is active but aria-controls names no tabpanel (APG tabs).");
        }
        for (const panel of panels) {
          if (roleOf(panel, win) !== "tabpanel") {
            ctx.problem(tab, `aria-controls points at ${describe(panel, win)}, not a tabpanel (APG tabs).`);
            continue;
          }
          if (!tab.id || !ids(panel, "aria-labelledby").includes(tab.id)) {
            ctx.problem(panel, `must be labelled by ${describe(tab, win)} via aria-labelledby (APG tabs).`);
          }
          if (isSelected(tab) && !isShown(panel, win)) {
            ctx.problem(panel, `belongs to active tab ${describe(tab, win)} but is hidden (APG tabs).`);
          }
          if (!isSelected(tab) && isShown(panel, win)) {
            ctx.problem(panel, `belongs to inactive tab ${describe(tab, win)} but is visible (APG tabs).`);
          }
        }
      }
    };
    checkPanels(all);

    const composite = {
      container: list,
      items: () => withRole(list, ["tab"], win),
      noun: "tab",
      source: "tabs",
    };
    const arrows = ctx.arrowsFor(ctx.orientationOf(list), isRtl(list, win));
    checkTabStop(ctx, composite, true);
    const stop = tabStops(list, win)[0];
    if (stop && selected[0] && !isDisabled(selected[0]) && stop !== selected[0]) {
      ctx.problem(stop, `takes Tab, but the active tab ${describe(selected[0], win)} should (APG tabs).`);
    }
    const enabled = all.filter((t) => !isDisabled(t));
    if (enabled.length < 2) return;

    const initialTab = selected[0] ?? enabled[0];
    ctx.defer(async () => {
      if (initialTab && !isSelected(initialTab)) initialTab.click();
    });

    const start = await enterComposite(ctx, composite);
    await checkNavigation(ctx, composite, {
      next: [arrows.next],
      previous: [arrows.previous],
      wraps: true,
      homeEnd: true,
    });
    for (const key of ["Enter", "Space"]) {
      const tab = await expectStep(ctx, composite, arrows.next, true, true);
      if (isSelected(tab) || isDisabled(tab)) continue;
      await ctx.press(key);
      if (!isSelected(tab)) {
        ctx.problem(tab, `${key} should activate the focused tab (APG tabs).`);
      }
      checkPanels(composite.items());
    }
    await returnTo(ctx, composite, start, arrows);
    if (start && !isSelected(start)) await ctx.press("Enter");
  }

  async function checkMenu(ctx) {
    const { doc, win } = ctx;
    let popup = withRole(doc.body, ["menu"], win).find((m) => isShown(m, win)) ?? null;
    const trigger =
      [...doc.body.querySelectorAll('[data-menu], [aria-haspopup="menu"]')].find(
        (el) => !isStaticPreview(el) && !isGone(el) && !isDisabled(el) && !el.closest('[role="menu"]'),
      ) ?? null;

    if (!popup && !trigger) {
      ctx.problem(doc.body, "has no open menu or menu button trigger (APG menu button).");
      return;
    }

    const ensureClosed = async () => {
      const open = withRole(doc.body, ["menu"], win).filter((m) => isShown(m, win));
      if (open.length) {
        await ctx.press("Escape", { allowBody: true });
        await ctx.press("Escape", { allowBody: true });
      }
    };
    ctx.defer(ensureClosed);

    if (trigger && !popup) {
      ctx.watch(trigger);
      ctx.requireName(trigger, "menu button");
      if (!["menu", "true"].includes(trigger.getAttribute("aria-haspopup") ?? "")) {
        ctx.problem(trigger, 'missing aria-haspopup="menu" (APG menu button).');
      }
      if (trigger.getAttribute("aria-expanded") !== "false") {
        ctx.problem(trigger, 'should have aria-expanded="false" while closed (APG menu button).');
      }
      await ctx.focus(trigger);
      await ctx.press("Enter");
      popup = popupOf(trigger, ["menu"], win) ?? withRole(doc.body, ["menu"], win).find((m) => isShown(m, win));
      if (!popup || !isShown(popup, win)) {
        ctx.problem(trigger, "Enter did not open its menu (APG menu button).");
        await ctx.click(trigger);
        popup = popupOf(trigger, ["menu"], win) ?? withRole(doc.body, ["menu"], win).find((m) => isShown(m, win));
      }
    }

    if (!popup || !isShown(popup, win)) {
      ctx.problem(trigger ?? doc.body, "menu did not open (APG menu).");
      return;
    }

    ctx.watch(popup);
    if (trigger && trigger.getAttribute("aria-expanded") !== "true") {
      ctx.problem(trigger, 'should have aria-expanded="true" while menu is open (APG menu button).');
    }
    ctx.requireName(popup, "menu");
    ctx.checkOwned(popup, MENU_ITEM_ROLES, "menu");
    const items = ownMenuItems(popup, win);
    if (!items.length) {
      ctx.problem(popup, "owns no menuitem elements (APG menu).");
      return;
    }
    for (const item of items) {
      ctx.requireName(item, "menu");
      const role = roleOf(item, win);
      const valid = role === "menuitemcheckbox" ? ["true", "false", "mixed"] : ["true", "false"];
      if (role !== "menuitem" && !valid.includes(item.getAttribute("aria-checked") ?? "")) {
        ctx.problem(item, `missing valid aria-checked for ${role} (APG menu).`);
      }
    }

    const composite = {
      container: popup,
      items: () => ownMenuItems(popup, win),
      noun: "menuitem",
      source: "menu",
    };
    checkTabStop(ctx, composite, false);

    if (!popup.contains(doc.activeElement) && !doc.activeElement?.hasAttribute("aria-activedescendant")) {
      ctx.problem(
        popup,
        `opened, but focus stayed on ${describe(doc.activeElement, win)}; focus must move into the menu (APG menu button).`,
      );
      return;
    }

    const arrows = ctx.arrowsFor(ctx.orientationOf(popup), isRtl(popup, win));
    const start = currentItem(ctx, composite) ?? (await expectStep(ctx, composite, arrows.next, true, undefined));
    await checkNavigation(ctx, composite, {
      next: [arrows.next],
      previous: [arrows.previous],
      homeEnd: true,
    });
    await checkTypeahead(ctx, composite, arrows);

    // Check submenu if present.
    const subTrigger = composite
      .items()
      .find((el) => !isDisabled(el) && (el.hasAttribute("aria-haspopup") || el.hasAttribute("data-submenu")));
    if (subTrigger) {
      await returnTo(ctx, composite, subTrigger, arrows);
      if (currentItem(ctx, composite) === subTrigger) {
        const openKey = isRtl(popup, win) ? "ArrowLeft" : "ArrowRight";
        const closeKey = isRtl(popup, win) ? "ArrowRight" : "ArrowLeft";
        await ctx.press(openKey);
        const sub = popupOf(subTrigger, ["menu"], win);
        if (!sub || !isShown(sub, win) || subTrigger.getAttribute("aria-expanded") !== "true") {
          ctx.problem(subTrigger, `${openKey} should open submenu with aria-expanded="true" (APG menu).`);
        } else {
          ctx.watch(sub);
          if (!sub.contains(doc.activeElement)) {
            ctx.problem(sub, `${openKey} opened submenu, but focus did not move inside it (APG menu).`);
          }
          await ctx.press(closeKey);
          if (isShown(sub, win) || subTrigger.getAttribute("aria-expanded") === "true") {
            ctx.problem(sub, `${closeKey} should close submenu and set aria-expanded="false" (APG menu).`);
          } else if (doc.activeElement !== subTrigger) {
            ctx.problem(
              subTrigger,
              `${closeKey} closed submenu, but focus went to ${describe(doc.activeElement, win)} instead of parent item (APG menu).`,
            );
          }
        }
      }
    }

    await returnTo(ctx, composite, start, arrows);
    await ctx.press("Escape");
    if (isShown(popup, win)) {
      ctx.problem(popup, "Escape should close the menu (APG menu).");
      return;
    }
    if (trigger) {
      if (trigger.getAttribute("aria-expanded") === "true") {
        ctx.problem(trigger, 'still has aria-expanded="true" after Escape closed the menu (APG menu button).');
      }
      if (doc.activeElement !== trigger) {
        ctx.problem(
          trigger,
          `Escape closed menu, but focus went to ${describe(doc.activeElement, win)} instead of trigger (APG menu button).`,
        );
        return;
      }
      // APG Menu Button: ArrowDown on the closed button opens the menu and focuses the first item.
      await ctx.press("ArrowDown");
      const viaArrow = popupOf(trigger, ["menu"], win) ?? withRole(doc.body, ["menu"], win).find((m) => isShown(m, win));
      if (!viaArrow || !isShown(viaArrow, win)) {
        ctx.problem(trigger, "ArrowDown on closed menu button should open the menu (APG menu button).");
      } else {
        if (!viaArrow.contains(doc.activeElement)) {
          ctx.problem(viaArrow, "ArrowDown opened menu, but focus did not move into it (APG menu button).");
        }
        await ctx.press("Escape");
      }

      // Re-open with Enter and activate a plain item with Enter.
      await ctx.focus(trigger);
      await ctx.press("Enter");
      const reopened = popupOf(trigger, ["menu"], win) ?? withRole(doc.body, ["menu"], win).find((m) => isShown(m, win));
      if (reopened && isShown(reopened, win)) {
        const comp2 = { container: reopened, items: () => ownMenuItems(reopened, win), noun: "menuitem", source: "menu" };
        const plain = comp2
          .items()
          .find((el) => roleOf(el, win) === "menuitem" && !el.hasAttribute("aria-haspopup") && !el.hasAttribute("data-submenu") && !isDisabled(el));
        if (plain) {
          await returnTo(ctx, comp2, plain, { next: "ArrowDown", previous: "ArrowUp" });
          if (currentItem(ctx, comp2) === plain) {
            await ctx.press("Enter");
            if (isShown(reopened, win)) {
              ctx.problem(plain, "Enter should activate the menuitem and close the menu (APG menu).");
            } else if (doc.activeElement !== trigger) {
              ctx.problem(
                trigger,
                `Enter closed menu, but focus went to ${describe(doc.activeElement, win)} instead of trigger (APG menu button).`,
              );
            }
          }
        }
      }
    }
  }

  async function checkListbox(ctx) {
    const { doc, win } = ctx;
    let box = withRole(doc.body, ["listbox"], win).find((el) => isShown(el, win)) ?? null;
    let trigger = null;

    if (!box) {
      // Enhanced <select> or listbox popup trigger.
      const selects = [...doc.body.querySelectorAll(".select select, [aria-haspopup=listbox]")].filter(
        (el) => !isStaticPreview(el) && !isGone(el),
      );
      for (const s of selects) {
        ctx.requireName(s, "listbox");
      }
      trigger = selects.find((el) => !isDisabled(el)) ?? null;
      if (!trigger) {
        ctx.problem(doc.body, "has no listbox or select trigger (APG listbox).");
        return;
      }
      const initialVal = trigger instanceof win.HTMLSelectElement ? trigger.value : null;
      ctx.defer(async () => {
        const openBox = withRole(doc.body, ["listbox"], win).find((el) => isShown(el, win));
        if (openBox) await ctx.press("Escape", { allowBody: true });
        if (trigger instanceof win.HTMLSelectElement && initialVal !== null && trigger.value !== initialVal) {
          trigger.value = initialVal;
        }
      });

      await ctx.focus(trigger);
      await ctx.press("ArrowDown");
      box = popupOf(trigger, ["listbox"], win) ?? withRole(doc.body, ["listbox"], win).find((el) => isShown(el, win));
      if (!box || !isShown(box, win)) {
        ctx.problem(trigger, "ArrowDown did not open its listbox (APG listbox).");
        return;
      }
    }

    ctx.watch(box);
    ctx.requireName(box, "listbox");
    ctx.checkOwned(box, ["option"], "listbox");
    const multiple = box.getAttribute("aria-multiselectable") === "true";
    const options = withRole(box, ["option"], win);
    if (!options.length) {
      ctx.problem(box, "owns no option elements (APG listbox).");
      return;
    }
    for (const option of options) {
      ctx.requireName(option, "listbox");
      if (!option.hasAttribute("aria-selected") && !(multiple && option.hasAttribute("aria-checked"))) {
        ctx.problem(option, 'missing aria-selected ("true" or "false") (APG listbox).');
      }
    }
    const selected = options.filter(isSelected);
    if (!multiple && selected.length > 1) {
      ctx.problem(box, `has ${selected.length} selected options without aria-multiselectable="true" (APG listbox).`);
    }

    const composite = {
      container: box,
      items: () => withRole(box, ["option"], win),
      noun: "option",
      source: "listbox",
    };
    const arrows = ctx.arrowsFor(ctx.orientationOf(box), isRtl(box, win));
    checkTabStop(ctx, composite, !trigger);

    if (options.filter((o) => !isDisabled(o)).length >= 2) {
      if (!trigger) await enterComposite(ctx, composite);
      const start = await checkNavigation(ctx, composite, {
        next: [arrows.next],
        previous: [arrows.previous],
        homeEnd: true,
      });
      await checkTypeahead(ctx, composite, arrows);
      await returnTo(ctx, composite, start, arrows);
    }

    if (trigger) {
      await ctx.press("Escape");
      if (isShown(box, win)) {
        ctx.problem(box, "Escape should close the listbox popup (APG listbox).");
      } else if (doc.activeElement !== trigger) {
        ctx.problem(
          trigger,
          `Escape closed listbox, but focus went to ${describe(doc.activeElement, win)} instead of trigger (APG listbox).`,
        );
      }
    }
  }

  async function checkComboboxActiveOption(ctx, box, popup, source) {
    const { doc, win } = ctx;
    const composite = {
      container: popup,
      items: () => withRole(popup, ["option"], win),
      noun: "option",
      source,
    };
    if (!composite.items().length) {
      ctx.problem(popup, `listbox owns no visible option elements (APG ${source}).`);
      return;
    }
    const stays = (key) => {
      if (doc.activeElement !== box) {
        ctx.problem(
          box,
          `${key} moved DOM focus to ${describe(doc.activeElement, win)}; it must stay on the combobox using aria-activedescendant (APG ${source}).`,
        );
        return false;
      }
      return true;
    };
    if (!currentItem(ctx, composite)) {
      await ctx.press("ArrowDown");
      if (!stays("ArrowDown")) return;
    }
    if (!currentItem(ctx, composite)) {
      ctx.problem(box, `ArrowDown should set an active option via aria-activedescendant (APG ${source}).`);
      return;
    }
    if (composite.items().filter((o) => !isDisabled(o)).length >= 2) {
      await expectStep(ctx, composite, "ArrowDown", true, undefined);
      if (!stays("ArrowDown")) return;
      await expectStep(ctx, composite, "ArrowUp", false, undefined);
      stays("ArrowUp");
    }
  }

  async function checkCombobox(ctx) {
    const { doc, win } = ctx;
    const boxes = [...doc.body.querySelectorAll('[role="combobox"]')].filter(
      (el) => !isStaticPreview(el) && !isGone(el),
    );
    const box = boxes.find((el) => !isDisabled(el)) ?? boxes[0];
    if (!box) {
      ctx.problem(doc.body, "has no element with role combobox (APG combobox).");
      return;
    }
    ctx.requireName(box, "combobox");
    if (!hasBoolean(box, "aria-expanded")) {
      ctx.problem(box, 'missing boolean aria-expanded ("true" or "false") (APG combobox).');
    }
    if (!tabStops(box, win).includes(box)) {
      ctx.problem(box, "is not a tab stop (APG combobox).");
    }

    const initialValue = "value" in box ? box.value : null;
    const expanded = () => box.getAttribute("aria-expanded") === "true";
    ctx.defer(async () => {
      if (expanded()) {
        box.focus();
        await ctx.press("Escape", { allowBody: true });
      }
      if (initialValue !== null && box.value !== initialValue) box.value = initialValue;
      box.blur();
    });

    await ctx.focus(box);
    // If focus automatically opened the popup, verify Escape closes it and ArrowDown re-opens it.
    if (expanded()) {
      await ctx.press("Escape");
      if (expanded()) {
        ctx.problem(box, "Escape should close its popup (APG combobox).");
      } else if (doc.activeElement !== box) {
        ctx.problem(
          box,
          `Escape closed popup, but focus went to ${describe(doc.activeElement, win)} instead of staying on combobox (APG combobox).`,
        );
        return;
      }
    }
    if (!expanded()) {
      await ctx.press("ArrowDown");
    }
    if (!expanded()) {
      ctx.problem(box, 'ArrowDown should open its popup with aria-expanded="true" (APG combobox).');
      return;
    }

    const popup = popupOf(box, ["listbox", "grid", "tree", "dialog"], win);
    if (!popup || !isShown(popup, win)) {
      ctx.problem(box, "is expanded, but aria-controls names no open listbox, grid, tree or dialog (APG combobox).");
      return;
    }
    ctx.watch(popup);
    const kind = roleOf(popup, win);
    if (kind !== "listbox" && box.getAttribute("aria-haspopup") !== kind) {
      ctx.problem(box, `controls a ${kind} without aria-haspopup="${kind}" (APG combobox).`);
    }
    if (kind === "listbox") {
      ctx.requireName(popup, "combobox");
      await checkComboboxActiveOption(ctx, box, popup, "combobox");
    }

    await ctx.press("Escape");
    if (expanded() || isShown(popup, win)) {
      ctx.problem(box, "Escape should close its popup and set aria-expanded=\"false\" (APG combobox).");
    }
    if (doc.activeElement !== box) {
      ctx.problem(
        box,
        `Escape closed popup, but focus went to ${describe(doc.activeElement, win)} instead of staying on combobox (APG combobox).`,
      );
    }
  }

  async function checkDialog(ctx) {
    const { doc, win } = ctx;
    let popup = withRole(doc.body, ["dialog", "alertdialog"], win).find((d) => isShown(d, win)) ?? null;
    const trigger =
      [...doc.body.querySelectorAll('[data-open], [aria-haspopup="dialog"]')].find((el) => {
        if (isStaticPreview(el) || isGone(el) || isDisabled(el)) return false;
        const target = popupOf(el, ["dialog", "alertdialog"], win);
        return !!target;
      }) ?? null;

    if (!popup && !trigger) {
      ctx.problem(doc.body, "has no open dialog or dialog trigger (APG dialog).");
      return;
    }

    ctx.defer(async () => {
      for (const d of doc.querySelectorAll("dialog[open]")) {
        if (!isStaticPreview(d)) d.close();
      }
    });

    if (!popup && trigger) {
      await ctx.focus(trigger);
      await ctx.press("Enter");
      popup = popupOf(trigger, ["dialog", "alertdialog"], win);
      if (!popup || !isShown(popup, win)) {
        ctx.problem(trigger, "Enter did not open its dialog (APG dialog).");
        await ctx.click(trigger);
        popup = popupOf(trigger, ["dialog", "alertdialog"], win);
      }
    }
    if (!popup || !isShown(popup, win)) {
      ctx.problem(trigger ?? doc.body, "dialog did not open (APG dialog).");
      return;
    }

    const ok = await checkModalDialog(ctx, popup, trigger, "dialog");
    if (!ok) return;

    await ctx.press("Escape", { allowBody: !trigger });
    if (isShown(popup, win)) {
      ctx.problem(popup, "Escape should close the dialog (APG dialog).");
      return;
    }
    if (trigger && doc.activeElement !== trigger) {
      ctx.problem(
        trigger,
        `Escape closed dialog, but focus went to ${describe(doc.activeElement, win)} instead of trigger (APG dialog).`,
      );
    }
  }

  async function checkCommandPalette(ctx) {
    const { doc, win } = ctx;
    const trigger = [...doc.body.querySelectorAll("[data-open]")].find((el) => {
      if (isStaticPreview(el) || isGone(el) || isDisabled(el)) return false;
      const target = byId(el, el.dataset.open);
      return target && !isStaticPreview(target) && target.matches(".command-palette");
    });
    let dialog =
      withRole(doc.body, ["dialog"], win).find((d) => d.matches(".command-palette") && isShown(d, win)) ?? null;

    if (!dialog && !trigger) {
      ctx.problem(doc.body, "has no live command palette dialog or opener (APG dialog/combobox).");
      return;
    }

    ctx.defer(async () => {
      for (const d of doc.querySelectorAll("dialog[open]")) {
        if (!isStaticPreview(d)) d.close();
      }
    });

    if (!dialog && trigger) {
      await ctx.focus(trigger);
      await ctx.press("Enter");
      dialog = byId(trigger, trigger.dataset.open);
      if (!dialog || !isShown(dialog, win)) {
        ctx.problem(trigger, "Enter did not open the command palette dialog (APG dialog).");
        await ctx.click(trigger);
      }
    }
    if (!dialog || !isShown(dialog, win)) {
      ctx.problem(trigger ?? doc.body, "command palette dialog did not open (APG dialog).");
      return;
    }

    const modalOk = await checkModalDialog(ctx, dialog, trigger, "dialog");
    if (!modalOk) return;

    const box = dialog.querySelector('[role="combobox"]');
    if (!box) {
      ctx.problem(dialog, "has no combobox search input inside command palette (APG combobox).");
    } else {
      ctx.requireName(box, "combobox");
      if (box.getAttribute("aria-expanded") !== "true") {
        ctx.problem(box, 'should have aria-expanded="true" while palette list is shown (APG combobox).');
      }
      const list = popupOf(box, ["listbox"], win);
      if (!list || !isShown(list, win)) {
        ctx.problem(box, "aria-controls names no visible listbox (APG combobox).");
      } else {
        ctx.watch(list);
        ctx.requireName(list, "listbox");
        await ctx.focus(box);
        await checkComboboxActiveOption(ctx, box, list, "combobox");
      }
    }

    await ctx.press("Escape", { allowBody: !trigger });
    if (isShown(dialog, win)) {
      ctx.problem(dialog, "Escape should close the command palette dialog (APG dialog).");
      return;
    }
    if (trigger && doc.activeElement !== trigger) {
      ctx.problem(
        trigger,
        `Escape closed command palette, but focus went to ${describe(doc.activeElement, win)} instead of trigger (APG dialog).`,
      );
    }
  }

  async function checkNativeDisclosure(ctx, summaries, source) {
    const { win } = ctx;
    for (const summary of summaries) {
      ctx.requireName(summary, source);
      if (!tabStops(summary, win).includes(summary)) {
        ctx.problem(summary, `summary is not a tab stop (APG ${source}).`);
      }
    }
    const target = summaries.find((s) => !isDisabled(s));
    if (!target) return;
    const details = target.parentElement;
    const initialOpen = details.open;
    ctx.defer(() => {
      details.open = initialOpen;
    });
    for (const key of ["Enter", "Space"]) {
      await ctx.focus(target);
      const before = details.open;
      await ctx.press(key);
      if (details.open === before) {
        ctx.problem(target, `${key} should toggle its disclosure (APG ${source}).`);
      } else {
        await ctx.press(key);
        if (details.open !== before) {
          ctx.problem(target, `${key} again should restore its disclosure state (APG ${source}).`);
        }
      }
    }
  }

  async function checkAccordion(ctx) {
    const { doc, win } = ctx;
    const summaries = [...doc.body.querySelectorAll("details > summary")].filter(
      (s) => !isStaticPreview(s) && !isGone(s),
    );
    if (summaries.length) {
      await checkNativeDisclosure(ctx, summaries, "accordion");
      return;
    }
    // Fallback for custom ARIA accordion.
    const buttons = withRole(doc.body, ["button"], win).filter((b) => b.hasAttribute("aria-expanded"));
    if (!buttons.length) {
      ctx.problem(doc.body, "has no accordion details/summary or header buttons with aria-expanded (APG accordion).");
      return;
    }
    for (const button of buttons) {
      ctx.requireName(button, "accordion");
      const heading = button.closest("h1, h2, h3, h4, h5, h6, [role=heading]");
      if (!heading) {
        ctx.problem(button, "header button is not wrapped in a heading (APG accordion).");
      } else if (heading.getAttribute("role") === "heading" && !heading.hasAttribute("aria-level")) {
        ctx.problem(heading, "custom heading role is missing aria-level (APG accordion).");
      }
      if (!hasBoolean(button, "aria-expanded")) {
        ctx.problem(button, 'missing boolean aria-expanded ("true" or "false") (APG accordion).');
      }
      if (button.getAttribute("aria-expanded") === "true") {
        const panel = ids(button, "aria-controls").map((id) => byId(button, id))[0];
        if (!panel) ctx.problem(button, "is expanded but aria-controls names no panel (APG accordion).");
      }
    }
    const target = buttons.find((b) => !isDisabled(b));
    if (!target) return;
    const initial = buttons.map((b) => b.getAttribute("aria-expanded"));
    ctx.defer(async () => {
      for (const [i, b] of buttons.entries()) {
        if (b.getAttribute("aria-expanded") !== initial[i] && !isDisabled(b)) b.click();
      }
    });
    for (const key of ["Enter", "Space"]) {
      await ctx.focus(target);
      const before = target.getAttribute("aria-expanded");
      await ctx.press(key);
      if (target.getAttribute("aria-expanded") === before) {
        ctx.problem(target, `${key} should toggle aria-expanded (APG accordion).`);
      } else {
        await ctx.press(key);
      }
    }
  }

  async function checkDisclosure(ctx) {
    const { doc, win } = ctx;
    const summaries = [...doc.body.querySelectorAll("details > summary")].filter(
      (s) => !isStaticPreview(s) && !isGone(s),
    );
    if (summaries.length) {
      await checkNativeDisclosure(ctx, summaries, "disclosure");
      return;
    }
    const buttons = [...doc.body.querySelectorAll("[aria-expanded]")].filter(
      (el) => !isStaticPreview(el) && !isGone(el),
    );
    if (!buttons.length) {
      ctx.problem(doc.body, "has no disclosure details/summary or button with aria-expanded (APG disclosure).");
      return;
    }
    for (const b of buttons) {
      if (roleOf(b, win) !== "button") ctx.problem(b, "disclosure trigger must have role button (APG disclosure).");
      ctx.requireName(b, "disclosure");
      if (!hasBoolean(b, "aria-expanded")) {
        ctx.problem(b, 'missing boolean aria-expanded ("true" or "false") (APG disclosure).');
      }
    }
    const target = buttons.find((b) => !isDisabled(b));
    if (!target) return;
    const initial = target.getAttribute("aria-expanded");
    ctx.defer(() => {
      if (target.getAttribute("aria-expanded") !== initial) target.click();
    });
    for (const key of ["Enter", "Space"]) {
      await ctx.focus(target);
      const before = target.getAttribute("aria-expanded");
      await ctx.press(key);
      if (target.getAttribute("aria-expanded") === before) {
        ctx.problem(target, `${key} should toggle aria-expanded (APG disclosure).`);
      } else {
        await ctx.press(key);
      }
    }
  }

  async function checkToggleControl(ctx, role, validStates, cycle, source) {
    const { doc, win } = ctx;
    const controls = withRole(doc.body, [role], win);
    if (!controls.length) {
      ctx.problem(doc.body, `has no element with role ${role} (APG ${source}).`);
      return;
    }
    for (const el of controls) {
      ctx.requireName(el, source);
      if (!validStates.includes(checkedOf(el, win))) {
        ctx.problem(el, `missing valid checked state (${validStates.join("/")}) (APG ${source}).`);
      }
    }
    const enabled = controls.filter((el) => !isDisabled(el));
    if (!enabled.length) return;

    // Test the first enabled control, plus the first mixed control if distinct.
    const toTest = [enabled[0]];
    const mixed = enabled.find((el) => checkedOf(el, win) === "mixed");
    if (mixed && mixed !== enabled[0]) toTest.push(mixed);

    for (const el of toTest) {
      const isNative = el instanceof win.HTMLInputElement;
      const savedChecked = isNative ? el.checked : null;
      const savedIndet = isNative ? el.indeterminate : null;
      const savedAria = el.getAttribute("aria-checked");
      ctx.defer(() => {
        if (isNative) {
          el.checked = savedChecked;
          el.indeterminate = savedIndet;
        }
        if (savedAria !== null) el.setAttribute("aria-checked", savedAria);
      });

      await ctx.focus(el);
      const before = checkedOf(el, win);
      await ctx.press("Space");
      const after = checkedOf(el, win);
      if (isReadOnly(el)) {
        if (after !== before) {
          ctx.problem(el, `Space changed state from "${before}" despite aria-readonly="true" (ARIA).`);
        }
        continue;
      }
      if (after === before) {
        ctx.problem(el, `Space should toggle state from "${before}" (APG ${source}).`);
        continue;
      }
      for (let p = 1; p < cycle && checkedOf(el, win) !== before; p++) {
        await ctx.press("Space");
      }
      if (checkedOf(el, win) !== before && before !== "mixed") {
        ctx.problem(el, `Space again should restore state to "${before}" (APG ${source}).`);
      }
    }
  }

  const checkSwitch = (ctx) => checkToggleControl(ctx, "switch", ["true", "false"], 2, "switch");
  const checkCheckbox = (ctx) => checkToggleControl(ctx, "checkbox", ["true", "false", "mixed"], 3, "checkbox");

  async function checkRadioGroup(ctx) {
    const { doc, win } = ctx;
    const group =
      withRole(doc.body, ["radiogroup"], win)[0] ??
      [...doc.body.querySelectorAll("fieldset")].find(
        (fs) => !isStaticPreview(fs) && !isGone(fs) && fs.querySelectorAll("input[type=radio]").length >= 2,
      ) ??
      null;

    if (!group) {
      ctx.problem(doc.body, "has no element with role radiogroup (or fieldset radio group) (APG radio group).");
      return;
    }
    if (roleOf(group, win) === "radiogroup") {
      ctx.requireName(group, "radio group");
      ctx.checkOwned(group, ["radio"], "radio group");
    } else if (!group.querySelector(":scope > legend")?.textContent?.trim()) {
      ctx.problem(group, "fieldset radio group is missing a legend (APG radio group).");
    }

    const radios = withRole(group, ["radio"], win);
    if (!radios.length) {
      ctx.problem(group, "owns no radio elements (APG radio group).");
      return;
    }
    for (const r of radios) {
      ctx.requireName(r, "radio group");
      if (!(r instanceof win.HTMLInputElement) && !hasBoolean(r, "aria-checked")) {
        ctx.problem(r, 'missing boolean aria-checked ("true" or "false") (APG radio group).');
      }
    }
    const isChecked = (el) => checkedOf(el, win) === "true";
    const checked = radios.filter(isChecked);
    if (checked.length > 1) {
      ctx.problem(group, `has ${checked.length} checked radios; at most 1 may be checked (APG radio group).`);
    }

    const composite = {
      container: group,
      items: () => withRole(group, ["radio"], win),
      noun: "radio",
      source: "radio group",
    };
    checkTabStop(ctx, composite, true);
    const stop = tabStops(group, win)[0];
    if (stop && checked[0] && !isDisabled(checked[0]) && stop !== checked[0]) {
      ctx.problem(stop, `takes Tab, but the checked radio ${describe(checked[0], win)} should (APG radio group).`);
    }
    if (radios.filter((r) => !isDisabled(r)).length < 2) return;

    const initialChecked = checked[0] ?? null;
    ctx.defer(() => {
      if (initialChecked && initialChecked instanceof win.HTMLInputElement) initialChecked.checked = true;
    });

    const start = await enterComposite(ctx, composite);
    const readOnly = isReadOnly(group);
    if (start && !isChecked(start) && !isDisabled(start)) {
      await ctx.press("Space");
      if (!readOnly && !isChecked(start)) {
        ctx.problem(start, "Space should check the focused radio (APG radio group).");
      }
    }
    const [forward, back] = isRtl(group, win) ? ["ArrowLeft", "ArrowRight"] : ["ArrowRight", "ArrowLeft"];
    await checkNavigation(ctx, composite, {
      next: ["ArrowDown", forward],
      previous: ["ArrowUp", back],
      wraps: true,
      homeEnd: false,
      onMove: (key, radio) => {
        if (!readOnly && !isDisabled(radio) && !isChecked(radio)) {
          ctx.problem(radio, `${key} should check the radio it moves to (APG radio group).`);
        }
      },
    });
    await returnTo(ctx, composite, start, { next: "ArrowDown", previous: "ArrowUp" });
  }

  async function checkSlider(ctx) {
    const { doc, win } = ctx;
    const sliders = withRole(doc.body, ["slider"], win);
    if (!sliders.length) {
      ctx.problem(doc.body, "has no element with role slider (APG slider).");
      return;
    }
    for (const thumb of sliders) {
      ctx.requireName(thumb, "slider");
      if (!(thumb instanceof win.HTMLInputElement) && !thumb.hasAttribute("aria-valuenow")) {
        ctx.problem(thumb, "missing aria-valuenow (APG slider).");
      }
      ctx.orientationOf(thumb);
    }
    const thumb = sliders.find((el) => !isDisabled(el));
    if (!thumb) return;

    const input = thumb instanceof win.HTMLInputElement ? thumb : null;
    const valueOf = () => Number(thumb.getAttribute("aria-valuenow") ?? input?.value);
    const minOf = () => Number(thumb.getAttribute("aria-valuemin") ?? (input?.min || 0));
    const maxOf = () => Number(thumb.getAttribute("aria-valuemax") ?? (input?.max === "" ? 100 : input?.max ?? 100));

    const start = valueOf();
    const initialRaw = input ? input.value : thumb.getAttribute("aria-valuenow");
    ctx.defer(() => {
      if (input) {
        input.value = initialRaw;
        input.dispatchEvent(new win.Event("input", { bubbles: true }));
      }
    });

    const vertical = ctx.orientationOf(thumb) === "vertical";
    const [inc, dec] = vertical
      ? ["ArrowUp", "ArrowDown"]
      : isRtl(thumb, win)
        ? ["ArrowLeft", "ArrowRight"]
        : ["ArrowRight", "ArrowLeft"];

    await ctx.focus(thumb);
    if (isReadOnly(thumb)) {
      const key = start >= maxOf() ? dec : inc;
      await ctx.press(key);
      if (valueOf() !== start) {
        ctx.problem(thumb, `${key} changed value despite aria-readonly="true" (ARIA).`);
      }
      return;
    }

    const expectChange = async (key, up) => {
      const before = valueOf();
      await ctx.press(key);
      const after = valueOf();
      if (up ? after > before : after < before) return;
      ctx.problem(thumb, `${key} should ${up ? "increase" : "decrease"} value from ${before}, got ${after} (APG slider).`);
    };

    const pairs = vertical ? [[inc, dec]] : [["ArrowUp", "ArrowDown"], [inc, dec]];
    for (const [up, down] of pairs) {
      const atMax = valueOf() >= maxOf();
      await expectChange(atMax ? down : up, !atMax);
      await expectChange(atMax ? up : down, atMax);
    }
    await ctx.press("End");
    if (valueOf() !== maxOf()) {
      ctx.problem(thumb, `End should set value to max (${maxOf()}), got ${valueOf()} (APG slider).`);
    }
    await ctx.press("Home");
    if (valueOf() !== minOf()) {
      ctx.problem(thumb, `Home should set value to min (${minOf()}), got ${valueOf()} (APG slider).`);
    }
  }

  async function checkToolbar(ctx) {
    const { doc, win } = ctx;
    const bars = withRole(doc.body, ["toolbar"], win);
    if (!bars.length) {
      ctx.problem(doc.body, "has no element with role toolbar (APG toolbar).");
      return;
    }
    const bar = bars.find((b) => focusables(b, win).some((el) => !isDisabled(el) && !isUnreachable(el))) ?? bars[0];
    if (bars.length > 1) ctx.requireName(bar, "toolbar");

    const composite = {
      container: bar,
      items: () => focusables(bar, win).filter((el) => !isUnreachable(el) && !isDisabled(el)),
      noun: "control",
      source: "toolbar",
    };
    const arrows = ctx.arrowsFor(ctx.orientationOf(bar), isRtl(bar, win));
    checkTabStop(ctx, composite, true);
    const items = composite.items();
    for (const item of items) ctx.requireName(item, "toolbar");
    if (items.length < 2 || items.some((el) => isEditable(el, win))) return;

    const start = await enterComposite(ctx, composite);
    await checkNavigation(ctx, composite, {
      next: [arrows.next],
      previous: [arrows.previous],
      homeEnd: true,
    });
    await returnTo(ctx, composite, start, arrows);
  }

  async function checkDatePicker(ctx) {
    const { doc, win } = ctx;
    const triggers = [...doc.body.querySelectorAll('.date-picker__field, [aria-haspopup="dialog"]')].filter(
      (el) => {
        if (isStaticPreview(el) || isGone(el) || isDisabled(el)) return false;
        const pop = popupOf(el, ["dialog"], win);
        return pop && !!pop.querySelector('[role="grid"]');
      },
    );
    // Prefer an unbounded date picker so PageDown/PageUp can cross month boundaries.
    const trigger =
      triggers.find((el) => !el.closest(".date-picker")?.hasAttribute("data-min") && !el.closest(".date-picker")?.hasAttribute("data-max")) ??
      triggers[0];

    if (!trigger) {
      ctx.problem(doc.body, "has no date picker dialog trigger with a grid (APG date picker).");
      return;
    }

    ctx.watch(trigger);
    ctx.requireName(trigger, "date picker");
    if (trigger.getAttribute("aria-haspopup") !== "dialog") {
      ctx.problem(trigger, 'missing aria-haspopup="dialog" (APG date picker).');
    }
    if (trigger.getAttribute("aria-expanded") !== "false") {
      ctx.problem(trigger, 'should have aria-expanded="false" while closed (APG date picker).');
    }

    const calendar = popupOf(trigger, ["dialog"], win);
    ctx.defer(async () => {
      if (calendar && isShown(calendar, win)) {
        await ctx.press("Escape", { allowBody: true });
      }
    });

    await ctx.focus(trigger);
    await ctx.press("Enter");
    if (!calendar || !isShown(calendar, win)) {
      ctx.problem(trigger, "Enter did not open the calendar dialog (APG date picker).");
      return;
    }
    ctx.watch(calendar);
    if (trigger.getAttribute("aria-expanded") !== "true") {
      ctx.problem(trigger, 'should have aria-expanded="true" while calendar is open (APG date picker).');
    }
    ctx.requireName(calendar, "date picker");

    const grid = calendar.querySelector('[role="grid"]');
    if (!grid) {
      ctx.problem(calendar, "calendar dialog has no role=\"grid\" (APG date picker).");
      return;
    }
    ctx.requireName(grid, "date picker");
    if (!calendar.contains(doc.activeElement)) {
      ctx.problem(
        calendar,
        `opened, but focus stayed on ${describe(doc.activeElement, win)}; focus must move into the calendar (APG date picker).`,
      );
      return;
    }
    const gridStops = tabStops(grid, win);
    if (gridStops.length !== 1) {
      ctx.problem(grid, `grid has ${gridStops.length} tab stops; a date grid should have exactly 1 (APG date picker).`);
    }

    const dayId = () => doc.activeElement?.dataset?.date || accessibleName(doc.activeElement, win);
    if (!grid.contains(doc.activeElement)) {
      const stop = gridStops[0];
      if (stop) await ctx.focus(stop);
    }
    if (grid.contains(doc.activeElement)) {
      ctx.requireName(doc.activeElement, "date picker");
      const startDay = dayId();
      const checkStep = async (key, expectDiffFrom, label) => {
        await ctx.press(key);
        if (!grid.contains(doc.activeElement)) {
          ctx.problem(grid, `${key} moved focus outside the date grid to ${describe(doc.activeElement, win)} (APG date picker).`);
          throw STOPPED;
        }
        const now = dayId();
        if (expectDiffFrom !== undefined && now === expectDiffFrom) {
          ctx.problem(grid, `${key} should move to ${label}, but stayed on "${now}" (APG date picker).`);
        }
        return now;
      };
      const nextDay = await checkStep("ArrowRight", startDay, "the next day");
      await checkStep("ArrowLeft", nextDay, "the previous day");
      const nextWeek = await checkStep("ArrowDown", dayId(), "the next week");
      await checkStep("ArrowUp", nextWeek, "the previous week");
      await checkStep("Home", undefined, "start of week");
      const homeDay = dayId();
      await checkStep("End", homeDay, "end of week");
      const monthBefore = accessibleName(grid, win);
      await ctx.press("PageDown");
      if (accessibleName(grid, win) === monthBefore) {
        ctx.problem(grid, `PageDown should move to the next month, but month stayed "${monthBefore}" (APG date picker).`);
      }
      await ctx.press("PageUp");
      if (accessibleName(grid, win) !== monthBefore) {
        ctx.problem(grid, `PageUp should return to "${monthBefore}", got "${accessibleName(grid, win)}" (APG date picker).`);
      }
    }

    await ctx.press("Escape");
    if (isShown(calendar, win)) {
      ctx.problem(calendar, "Escape should close the calendar dialog (APG date picker).");
      return;
    }
    if (trigger.getAttribute("aria-expanded") === "true") {
      ctx.problem(trigger, 'still has aria-expanded="true" after Escape closed the calendar (APG date picker).');
    }
    if (doc.activeElement !== trigger) {
      ctx.problem(
        trigger,
        `Escape closed calendar, but focus went to ${describe(doc.activeElement, win)} instead of trigger (APG date picker).`,
      );
    }
  }

  async function checkCarousel(ctx) {
    const { doc, win } = ctx;
    const track =
      [...doc.body.querySelectorAll('[aria-roledescription="carousel"], .carousel')].find(
        (el) => !isStaticPreview(el) && !isGone(el),
      ) ?? null;
    if (!track) {
      ctx.problem(doc.body, "has no carousel element (APG carousel).");
      return;
    }
    if (track.getAttribute("aria-roledescription") !== "carousel") {
      ctx.problem(track, 'missing aria-roledescription="carousel" (APG carousel).');
    }
    ctx.requireName(track, "carousel");

    const slides = [...track.children].filter((el) => !isGone(el));
    if (!slides.length) {
      ctx.problem(track, "has no slides (APG carousel).");
    }
    for (const slide of slides) {
      if (roleOf(slide, win) !== "group") {
        ctx.problem(slide, 'slide should have role="group" (APG carousel).');
      }
      if (slide.getAttribute("aria-roledescription") !== "slide") {
        ctx.problem(slide, 'slide missing aria-roledescription="slide" (APG carousel).');
      }
      ctx.requireName(slide, "carousel");
    }

    const controls = track.id
      ? [...doc.body.querySelectorAll(`[aria-controls="${track.id}"]`)].filter((el) => !isStaticPreview(el) && !isGone(el))
      : [];
    if (controls.length < 2) {
      ctx.problem(track, "missing previous/next controls referencing the carousel via aria-controls (APG carousel).");
    }
    for (const ctrl of controls) {
      if (roleOf(ctrl, win) !== "button") ctx.problem(ctrl, "carousel control must be a button (APG carousel).");
      ctx.requireName(ctrl, "carousel");
    }
    const initialScroll = track.scrollLeft;
    ctx.defer(() => {
      track.scrollLeft = initialScroll;
    });
    const enabled = controls.find((c) => !isDisabled(c));
    if (enabled) await ctx.click(enabled);
  }

  async function checkBreadcrumb(ctx) {
    const { doc, win } = ctx;
    const navs = [...doc.body.querySelectorAll("nav.breadcrumb, nav[aria-label]")].filter(
      (el) => !isStaticPreview(el) && !isGone(el),
    );
    if (!navs.length) {
      ctx.problem(doc.body, "has no breadcrumb navigation landmark (APG breadcrumb).");
      return;
    }
    for (const nav of navs) {
      if (roleOf(nav, win) !== "navigation") {
        ctx.problem(nav, "breadcrumb container must be a navigation landmark (APG breadcrumb).");
      }
      ctx.requireName(nav, "breadcrumb");
      const current = nav.querySelector('[aria-current="page"]');
      if (!current) {
        ctx.problem(nav, 'missing aria-current="page" on current item (APG breadcrumb).');
      }
      for (const link of nav.querySelectorAll("a[href]")) {
        ctx.requireName(link, "breadcrumb");
      }
    }
  }

  const PATTERNS = {
    tabs: checkTabs,
    menu: checkMenu,
    listbox: checkListbox,
    select: checkListbox,
    combobox: checkCombobox,
    dialog: checkDialog,
    "command-palette": checkCommandPalette,
    accordion: checkAccordion,
    disclosure: checkDisclosure,
    switch: checkSwitch,
    checkbox: checkCheckbox,
    "radio-group": checkRadioGroup,
    radio: checkRadioGroup,
    slider: checkSlider,
    toolbar: checkToolbar,
    "date-picker": checkDatePicker,
    carousel: checkCarousel,
    breadcrumb: checkBreadcrumb,
  };

  window.checkPattern = async function checkPattern(doc, pattern) {
    const check = PATTERNS[pattern];
    if (!check) {
      return [`Unknown pattern "${pattern}". Supported: ${Object.keys(PATTERNS).join(", ")}.`];
    }
    if (!doc || !doc.body || !doc.defaultView) {
      return ["Document is not ready for pattern check."];
    }
    const ctx = createContext(doc);
    ctx.checkReferences();
    try {
      await check(ctx);
    } catch (err) {
      if (err !== STOPPED) {
        ctx.problem(doc.body, `unexpected check error: ${err?.message || err}`);
      }
    } finally {
      await ctx.cleanup();
    }
    return [...ctx.problems];
  };
})();
