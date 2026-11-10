// Minimaly behaviors. Icons: <i class="icon" data-icon="bell"></i> becomes the inline Phosphor SVG.
// Weights through data-icon-style: regular (default), bold, fill, light, thin, duotone.
// Inline SVG, not an icon font, so Copy to Figma receives real vectors.
(() => {
  // Phosphor 2.1.1 ships in icons/, next to this file: pages work offline.
  const ICONS = new URL("icons/", document.currentScript.src).href;
  const cache = new Map();
  const load = (style, name) => {
    const key = style === "regular" ? `regular/${name}` : `${style}/${name}-${style}`;
    if (!cache.has(key)) cache.set(key, fetch(`${ICONS}${key}.svg`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Unknown icon ${key}`)))));
    return cache.get(key);
  };
  const render = (el) =>
    load(el.dataset.iconStyle || "regular", el.dataset.icon).then(
      (svg) => {
        el.innerHTML = svg.replace(/\s(width|height)="\d+"/g, "");
        el.querySelector("svg").setAttribute("aria-hidden", "true");
      },
      (e) => {
        el.dataset.iconError = e.message;
        console.error(e);
      },
    );
  // Pages that render their markup from JS call renderIcons(root) after each render.
  window.renderIcons = (root = document) => Promise.all([...root.querySelectorAll("[data-icon]:not(:has(svg))")].map(render));
  // Resolved once every icon of the page is in place; the render linter waits on it.
  window.iconsReady = window.renderIcons();

  // Tooltips: any element with data-tip="…" shows a .tooltip on hover or keyboard focus.
  // Works for markup rendered later (delegated). Placed above the element, or below when there is no room.
  // Timing from interior.dev's Tooltip Group: a cold pointer rests 200 ms before a bubble opens. Leaving waits 120 ms,
  // so crossing the gap to a neighbour does not blink. For 400 ms after a bubble closes, the next one opens at once.
  const OPEN_DELAY = 200;
  const LEAVE_GRACE = 120;
  const WARM_FOR = 400;
  const tip = Object.assign(document.createElement("div"), { className: "tooltip", role: "tooltip", hidden: true });
  tip.style.cssText = "position:fixed;z-index:1000;pointer-events:none";
  let openTimer = 0;
  let leaveTimer = 0;
  let owner = null;
  let warmUntil = 0;
  // cold: a click, a key or a scroll ends the group, the next bubble waits again.
  const hide = (cold) => {
    clearTimeout(openTimer);
    clearTimeout(leaveTimer);
    leaveTimer = 0;
    if (!tip.hidden) warmUntil = cold === true ? 0 : performance.now() + WARM_FOR;
    tip.hidden = true;
    owner = null;
  };
  const show = (el, instant) => {
    if (!tip.isConnected) document.body.append(tip);
    tip.textContent = el.dataset.tip;
    // Moving along a warm group swaps the text in place: no pop-in for each neighbour.
    tip.toggleAttribute("data-instant", instant);
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    // Layout size, not the bounding box: the pop-in animation starts slightly scaled down.
    const t = { width: tip.offsetWidth, height: tip.offsetHeight };
    const left = Math.max(8, Math.min(innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2));
    // Above the element; below only when there is no room above.
    const above = r.top - 8 - t.height > 0;
    tip.style.left = `${left}px`;
    tip.style.top = `${above ? r.top - 8 - t.height : r.bottom + 8}px`;
    // The side drives the direction it opens from (CSS --from).
    tip.dataset.side = above ? "top" : "bottom";
  };
  const arm = (el, delay) => {
    clearTimeout(leaveTimer);
    leaveTimer = 0;
    if (el === owner) return;
    const warm = !tip.hidden || performance.now() < warmUntil;
    hide();
    owner = el;
    if (warm || !delay) show(el, warm);
    else openTimer = setTimeout(() => show(el, false), delay);
  };
  const leave = () => { if (owner && !leaveTimer) leaveTimer = setTimeout(hide, LEAVE_GRACE); };
  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest?.("[data-tip]");
    el ? arm(el, OPEN_DELAY) : leave();
  });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest?.("[data-tip]");
    if (el?.matches(":focus-visible")) arm(el, 0);
  });
  addEventListener("focusout", hide, true);
  for (const type of ["pointerdown", "scroll", "keydown"]) addEventListener(type, () => hide(true), true);
  // Leaving the page, or entering a screen iframe, sends no pointerover here: hide on the way out.
  document.addEventListener("pointerout", (e) => { if (!e.relatedTarget) leave(); });

  // Select: the native <select> keeps the value and fires "change"; its list opens as a Minimaly menu instead of the
  // browser's. Works for selects rendered later (delegated). Keys: Enter, Space or ↓ open; ↑ ↓ move; Enter picks; Esc closes.
  let menu = null;
  const close = (refocus) => {
    if (!menu) return;
    const { el, select } = menu;
    menu = null;
    // hidden plays the closing transition (CSS), then the list goes.
    el.hidden = true;
    setTimeout(() => el.remove(), parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0);
    if (refocus) select.focus();
  };
  const pick = (select, value) => {
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close(true);
  };
  const open = (select) => {
    close();
    const el = Object.assign(document.createElement("div"), { className: "popover select__menu", role: "listbox" });
    el.innerHTML = [...select.options].map((o) => `<button type="button" class="select__option" role="option" data-value="${o.value.replace(/"/g, "&quot;")}" aria-selected="${o.selected}"><span></span><i class="icon" data-icon="check"></i></button>`).join("");
    el.querySelectorAll(".select__option").forEach((b, i) => { b.firstChild.textContent = select.options[i].text; });
    document.body.append(el);
    window.renderIcons(el);
    const r = select.closest(".select").getBoundingClientRect();
    el.style.minWidth = `${r.width}px`;
    el.style.left = `${Math.min(r.left, innerWidth - el.offsetWidth - 8)}px`;
    const below = r.bottom + 4 + el.offsetHeight < innerHeight;
    el.style.top = `${below ? r.bottom + 4 : r.top - 4 - el.offsetHeight}px`;
    el.dataset.side = below ? "bottom" : "top";
    menu = { el, select };
    (el.querySelector('[aria-selected="true"]') || el.firstElementChild).focus();
  };
  document.addEventListener("mousedown", (e) => {
    // The whole box opens the list: the inline label and the caret included.
    const select = e.target.closest?.(".select")?.querySelector("select");
    if (select) {
      e.preventDefault();
      menu?.select === select ? close(true) : open(select);
    } else if (menu && !menu.el.contains(e.target)) close();
  });
  document.addEventListener("click", (e) => {
    const option = menu && e.target.closest(".select__option");
    if (option) pick(menu.select, option.dataset.value);
  });
  document.addEventListener("keydown", (e) => {
    if (menu) {
      const items = [...menu.el.querySelectorAll(".select__option")];
      const i = items.indexOf(document.activeElement);
      if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); close(true); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))].focus(); }
      e.stopPropagation();
      return;
    }
    const select = e.target.closest?.(".select select");
    if (select && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); open(select); }
  }, true);
  addEventListener("resize", () => close());

  // Live region shared by the behaviours below: a screen reader hears outcomes, the visible labels can stay short.
  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
  const announce = (text) => {
    if (!status.isConnected) document.body.append(status);
    status.textContent = "";
    // Cleared first, so the same outcome twice in a row is announced twice.
    setTimeout(() => { status.textContent = text; }, 50);
  };

  // Segmented and tabs: one indicator per group slides under the chosen option, the highlight never jumps (interior.dev).
  // The page only flips aria-pressed (segmented) or aria-selected (tabs); the indicator follows, also for groups rendered later.
  const CHOSEN = { segmented: ':scope > .btn[aria-pressed="true"]', tabs: ':scope > [role="tab"][aria-selected="true"]' };
  const sizer = new ResizeObserver((entries) => entries.forEach((e) => placeIndicator(e.target)));
  const placeIndicator = (group) => {
    const kind = group.classList.contains("tabs") ? "tabs" : "segmented";
    let bar = group.querySelector(`:scope > .${kind}__indicator`);
    if (!bar) {
      bar = Object.assign(document.createElement("span"), { className: `${kind}__indicator` });
      bar.setAttribute("aria-hidden", "true");
      group.prepend(bar);
      sizer.observe(group);
    }
    const on = group.querySelector(CHOSEN[kind]);
    bar.hidden = !on;
    if (!on) return;
    bar.style.width = `${on.offsetWidth}px`;
    bar.style.transform = `translateX(${on.offsetLeft}px)`;
    // The first placement lands in place instead of sliding in from the left edge: reading the layout commits it
    // before the transition is switched on.
    if (on.offsetWidth && !bar.hasAttribute("data-ready")) {
      void bar.offsetWidth;
      bar.setAttribute("data-ready", "");
    }
  };

  // Async button (interior.dev Loading Button and Copy Button): idle, busy, done, error.
  // All labels share one grid cell, so the button keeps the width of its longest label and nothing around it moves.
  // Busy is not disabled: focus stays and a second click is ignored. The accessible name never changes; outcomes are announced.
  const STATES = [["busy", "circle-notch"], ["done", "check"], ["error", "warning"]];
  const buildButton = (btn) => {
    const copy = btn.hasAttribute("data-copy");
    const iconOnly = btn.dataset.variant === "icon";
    const idle = Object.assign(document.createElement("span"), { className: "btn__label" });
    idle.dataset.for = "idle";
    idle.append(...btn.childNodes);
    const name = btn.getAttribute("aria-label") || idle.textContent.trim();
    const text = {
      busy: btn.dataset.busy || idle.textContent.trim(),
      done: btn.dataset.done || (copy ? "Copied" : "Done"),
      error: btn.dataset.error || (copy ? "Failed" : "Try again"),
    };
    const labels = STATES.map(([state, icon]) => {
      const label = Object.assign(document.createElement("span"), { className: "btn__label" });
      label.dataset.for = state;
      label.innerHTML = `<i class="icon" data-icon="${icon}"></i>`;
      if (!iconOnly) label.append(text[state]);
      return label;
    });
    btn.append(idle, ...labels);
    for (const label of btn.children) label.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-label", name);
    btn.dataset.state = "idle";
    btn.asyncText = text;
    window.renderIcons(btn);
  };
  const holds = new WeakMap();
  const setState = (btn, state, hold) => {
    clearTimeout(holds.get(btn));
    btn.dataset.state = state;
    state === "busy" ? btn.setAttribute("aria-busy", "true") : btn.removeAttribute("aria-busy");
    if (state === "done" || state === "error") {
      announce(btn.asyncText[state]);
      holds.set(btn, setTimeout(() => setState(btn, "idle"), hold));
    }
  };
  // Pages run their action through the button: runButton(btn, () => fetch(…)). A throw or a rejection ends in error.
  // Reporting the error itself stays the page's job: the promise rejects with it.
  window.runButton = async (btn, action, hold = 1400) => {
    if (btn.dataset.state === "busy") return;
    setState(btn, "busy");
    try {
      const result = await action();
      setState(btn, "done", hold);
      return result;
    } catch (e) {
      setState(btn, "error", hold);
      throw e;
    }
  };
  // data-copy="…" copies on click with no script. An empty value copies the code of the .code-block the button sits in;
  // anywhere else it copies nothing and reports nothing. Each new copy restarts the 2 s hold instead of stacking timers.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".btn[data-copy]");
    const text = btn && (btn.dataset.copy || btn.closest(".code-block")?.querySelector(".code code")?.textContent);
    if (!text) return;
    copyText(text).then(() => setState(btn, "done", 2000), () => setState(btn, "error", 2000));
  });
  // The async clipboard is refused in iframes without clipboard-write (Playground, viewer screens): copy through a selection then.
  const copyText = (text) =>
    (navigator.clipboard?.writeText(text) ?? Promise.reject()).catch(() => {
      const focused = document.activeElement;
      const area = Object.assign(document.createElement("textarea"), { value: text });
      area.style.cssText = "position:fixed;opacity:0";
      document.body.append(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      focused?.focus();
      if (!copied) throw new Error("Clipboard refused");
    });

  // Value (interior.dev Value Flash): when the text of a .value changes, it lights up for --duration-flash
  // with an arrow for the direction. The page only sets textContent. data-label="…" also announces the settled
  // value, once the figure has been quiet for 700 ms.
  const values = new WeakMap();
  const quiet = new WeakMap();
  // The characters that changed, compared from the right (figures grow on the left), each in a .value__char that rolls in.
  // values already holds the new text, so the rewrite below does not count as a new change.
  const rollDigits = (el, prev, next) => {
    const offset = next.length - prev.length;
    let i = 0;
    el.replaceChildren(...[...next].map((ch, k) => {
      if (prev[k - offset] === ch) return document.createTextNode(ch);
      const span = Object.assign(document.createElement("span"), { className: "value__char", textContent: ch });
      span.style.setProperty("--i", i++);
      return span;
    }));
  };
  const toNumber = (text) => parseFloat(text.replace(/\u2212/g, "-").replace(/[^\d.-]/g, ""));
  const watchValue = (el) => {
    const next = el.textContent;
    const prev = values.get(el);
    values.set(el, next);
    if (prev === undefined || prev === next) return;
    const a = toNumber(prev);
    const b = toNumber(next);
    el.removeAttribute("data-trend");
    void el.offsetWidth; // restarts the flash when a new change lands mid-flash
    el.dataset.trend = b > a ? "up" : b < a ? "down" : "change";
    rollDigits(el, prev, next);
    if (el.dataset.label) {
      clearTimeout(quiet.get(el));
      quiet.set(el, setTimeout(() => announce(`${el.dataset.label}: ${el.textContent}`), 700));
    }
  };
  document.addEventListener("animationend", (e) => {
    if (e.animationName === "value-flash" && !e.pseudoElement) e.target.removeAttribute("data-trend");
  });

  // Skeleton (interior.dev Skeleton Swap): loadInto(box, load) holds the box at its final height while load() runs.
  // CSS keeps the skeleton invisible for its first 120 ms, so a faster answer never shows one. Once painted it stays
  // at least 380 ms, so it cannot blink. load() resolves to an HTML string or a node.
  const SKELETON_DELAY = 120;
  const SKELETON_MIN = 380;
  window.loadInto = async (box, load, { lines = 3, height, label } = {}) => {
    const start = performance.now();
    const skeleton = Object.assign(document.createElement("div"), { className: "skeleton" });
    if (height) {
      skeleton.dataset.variant = "block";
      skeleton.style.height = `${height}px`;
    } else skeleton.innerHTML = "<span></span>".repeat(lines);
    box.setAttribute("aria-busy", "true");
    box.replaceChildren(skeleton);
    try {
      const content = await load();
      const shown = performance.now() - start - SKELETON_DELAY;
      if (shown > 0 && shown < SKELETON_MIN) await new Promise((r) => setTimeout(r, SKELETON_MIN - shown));
      typeof content === "string" ? (box.innerHTML = content) : box.replaceChildren(content);
      window.renderIcons(box);
      if (label) announce(`${label} loaded`);
    } finally {
      box.removeAttribute("aria-busy");
    }
  };

  // Tabs (interior.dev Tabs): a .tabs role="tablist" of .tabs__tab role="tab", each aria-controls its .tabs__panel.
  // Click, arrows, Home and End select at once; only the selected tab is in the Tab order. The list fires "change".
  const tabsOf = (list) => [...list.querySelectorAll(':scope > [role="tab"]')];
  const selectTab = (tab, focus) => {
    const list = tab.closest(".tabs");
    const changed = tab.getAttribute("aria-selected") !== "true";
    for (const t of tabsOf(list)) {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
    if (changed) list.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: tab }));
  };
  const initTabs = (list) => {
    const tabs = tabsOf(list);
    const chosen = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs.find((t) => !t.disabled);
    if (chosen) selectTab(chosen, false);
    placeIndicator(list);
  };
  document.addEventListener("click", (e) => {
    const tab = e.target.closest?.('.tabs > [role="tab"]');
    if (tab && !tab.disabled) selectTab(tab, false);
  });
  document.addEventListener("keydown", (e) => {
    const tab = e.target.closest?.('.tabs > [role="tab"]');
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const tabs = tabsOf(tab.closest(".tabs")).filter((t) => !t.disabled);
    const i = tabs.indexOf(tab);
    const next = { ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length], ArrowRight: tabs[(i + 1) % tabs.length], Home: tabs[0], End: tabs.at(-1) }[e.key];
    selectTab(next, true);
  });

  // Menu (interior.dev Dropdown and Context Menu): a .popover.menu of .menu__item buttons, hidden in the markup.
  // data-menu="<id>" on a button opens it below; data-context-menu="<id>" on a surface opens it at the pointer on right-click,
  // or at the surface with the menu key or Shift+F10. Arrows move, Esc and Tab close, a chosen item closes it and focus returns.
  let openMenu = null;
  const menuItems = (el) => [...el.querySelectorAll('.menu__item:not(:disabled):not([aria-disabled="true"])')];
  const closeMenu = (refocus) => {
    if (!openMenu) return;
    const { el, trigger } = openMenu;
    openMenu = null;
    el.hidden = true;
    if (trigger.hasAttribute("data-menu")) trigger.setAttribute("aria-expanded", "false");
    if (refocus) trigger.focus();
  };
  const showMenu = (el, trigger, at) => {
    closeMenu();
    // Out of any transformed or clipping parent, so position: fixed means the viewport.
    if (el.parentElement !== document.body) document.body.append(el);
    el.hidden = false;
    const r = at ? { left: at.x, top: at.y, bottom: at.y } : trigger.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(r.left, innerWidth - el.offsetWidth - 8))}px`;
    const below = r.bottom + 4 + el.offsetHeight < innerHeight;
    el.style.top = `${below ? r.bottom + 4 : Math.max(8, r.top - 4 - el.offsetHeight)}px`;
    el.dataset.side = below ? "bottom" : "top";
    openMenu = { el, trigger };
    if (trigger.hasAttribute("data-menu")) trigger.setAttribute("aria-expanded", "true");
    menuItems(el)[0]?.focus();
  };
  const initMenuTrigger = (trigger) => {
    const el = document.getElementById(trigger.dataset.menu || trigger.dataset.contextMenu);
    if (!el) return;
    el.setAttribute("role", "menu");
    el.hidden = true;
    el.querySelectorAll(".menu__item").forEach((item) => item.setAttribute("role", "menuitem"));
    if (trigger.hasAttribute("data-menu")) {
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", "false");
    } else if (!trigger.hasAttribute("tabindex")) trigger.tabIndex = 0;
  };
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest?.("[data-menu]");
    if (trigger) {
      openMenu?.trigger === trigger ? closeMenu(true) : showMenu(document.getElementById(trigger.dataset.menu), trigger);
      return;
    }
    if (openMenu && e.target.closest?.(".menu__item") && openMenu.el.contains(e.target)) closeMenu(true);
  });
  document.addEventListener("contextmenu", (e) => {
    const surface = e.target.closest?.("[data-context-menu]");
    if (!surface) return;
    e.preventDefault();
    // A keyboard-opened context menu has no pointer position: it opens at the surface.
    const r = surface.getBoundingClientRect();
    const at = e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : { x: r.left, y: r.bottom };
    showMenu(document.getElementById(surface.dataset.contextMenu), surface, at);
  });
  document.addEventListener("mousedown", (e) => {
    if (openMenu && !openMenu.el.contains(e.target) && !openMenu.trigger.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (!openMenu) return;
    const items = menuItems(openMenu.el);
    const i = items.indexOf(document.activeElement);
    const go = { ArrowDown: items[(i + 1) % items.length], ArrowUp: items[(i - 1 + items.length) % items.length], Home: items[0], End: items.at(-1) }[e.key];
    if (go) { e.preventDefault(); go.focus(); }
    else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); closeMenu(true); }
  });
  addEventListener("scroll", (e) => { if (openMenu && !openMenu.el.contains(e.target)) closeMenu(); }, true);
  addEventListener("resize", () => closeMenu());

  // Modal and drawer: native <dialog class="modal|drawer">. data-open="<id>" opens one, data-close closes the one it sits in.
  // Esc closes the top one and focus returns to the opener (both native). The backdrop closes only on a press that both
  // starts and ends on it, so a text selection dragged out of the panel never closes it; data-static disables it.
  let pressedBackdrop = null;
  const onBackdrop = (e) => {
    const d = e.target;
    if (!d.matches?.("dialog:is(.modal, .drawer):modal") || d.hasAttribute("data-static")) return null;
    const r = d.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom ? d : null;
  };
  document.addEventListener("pointerdown", (e) => { pressedBackdrop = onBackdrop(e); });
  document.addEventListener("click", (e) => {
    const opener = e.target.closest?.("[data-open]");
    if (opener) document.getElementById(opener.dataset.open)?.showModal();
    const closer = e.target.closest?.("dialog [data-close]");
    if (closer) closer.closest("dialog").close();
    if (pressedBackdrop && onBackdrop(e) === pressedBackdrop) pressedBackdrop.close();
    pressedBackdrop = null;
  });

  // Toast: toast("Saved", { variant: "success" | "critical", action: { label, onClick }, duration }) shows news at the
  // bottom right and returns a function that dismisses it. 4 s by default; critical stays until dismissed. Hovering or
  // focusing a toast pauses its clock. The same message again restarts its clock instead of stacking a copy. At most 3.
  const TOAST_ICONS = { success: "check-circle", critical: "warning-circle" };
  let toastRoot = null;
  const dismissToast = (el) => {
    if (el.hasAttribute("data-leaving")) return;
    clearTimeout(el.toastTimer);
    el.setAttribute("data-leaving", "");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  };
  const runToast = (el, ms) => {
    clearTimeout(el.toastTimer);
    if (!ms) return;
    el.toastEnd = performance.now() + ms;
    el.toastTimer = setTimeout(() => dismissToast(el), ms);
  };
  window.toast = (message, { variant, action, duration = variant === "critical" ? 0 : 4000 } = {}) => {
    if (!toastRoot) toastRoot = Object.assign(document.createElement("div"), { className: "toasts" });
    if (!toastRoot.isConnected) document.body.append(toastRoot);
    let el = [...toastRoot.children].find((t) => t.toastMessage === message && !t.hasAttribute("data-leaving"));
    if (!el) {
      el = Object.assign(document.createElement("div"), { className: "toast" });
      el.toastMessage = message;
      if (variant) el.dataset.variant = variant;
      if (TOAST_ICONS[variant]) el.innerHTML = `<i class="icon" data-icon="${TOAST_ICONS[variant]}"></i>`;
      el.append(Object.assign(document.createElement("span"), { className: "toast__text", textContent: message }));
      if (action) {
        const b = Object.assign(document.createElement("button"), { className: "btn", textContent: action.label });
        b.addEventListener("click", () => { action.onClick?.(); dismissToast(el); });
        el.append(b);
      }
      const close = Object.assign(document.createElement("button"), { className: "btn", innerHTML: '<i class="icon" data-icon="x"></i>' });
      close.dataset.variant = "icon";
      close.setAttribute("aria-label", "Dismiss");
      close.addEventListener("click", () => dismissToast(el));
      el.append(close);
      el.toastDuration = duration;
      const pause = () => { clearTimeout(el.toastTimer); el.toastLeft = el.toastEnd - performance.now(); };
      const resume = () => { if (el.toastDuration && !el.matches(":hover, :focus-within")) runToast(el, Math.max(1000, el.toastLeft)); };
      el.addEventListener("pointerenter", pause);
      el.addEventListener("focusin", pause);
      el.addEventListener("pointerleave", resume);
      el.addEventListener("focusout", () => setTimeout(resume));
      toastRoot.append(el);
      window.renderIcons(el);
      const live = [...toastRoot.children].filter((t) => !t.hasAttribute("data-leaving"));
      live.slice(0, Math.max(0, live.length - 3)).forEach(dismissToast);
    }
    announce(message);
    runToast(el, duration);
    return () => dismissToast(el);
  };

  // Streaming text: streamText(el, text, { rate }) reveals an agent's answer word by word, rate in words per second (18).
  // Words due are computed from elapsed time, so the rate holds when frames drop. aria-busy holds the screen reader
  // until the end. A click on the text shows it all at once. Reduced motion shows it at once. Resolves when complete.
  const streams = new WeakMap();
  // HTML streams too: words appear one by one inside their elements, and whole pieces (a citation, an icon) appear at
  // once when the stream reaches them.
  const STREAM_WHOLE = ".cite, .icon, img, [data-stream-whole]";
  window.streamText = (el, content, { rate = 18 } = {}) => new Promise((resolve) => {
    streams.get(el)?.finish(false);
    const source = document.createElement("template");
    /<[a-z][^>]*>/i.test(content) ? (source.innerHTML = content) : (source.content.textContent = content);
    const live = source.content.cloneNode(true);
    const steps = [];
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/).filter(Boolean);
          child.textContent = "";
          for (const part of parts) steps.push(() => { child.textContent += part; });
        } else if (child.nodeType === Node.ELEMENT_NODE && child.matches(STREAM_WHOLE)) {
          child.style.display = "none";
          steps.push(() => child.style.removeProperty("display"));
        } else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
      }
    };
    walk(live);
    el.replaceChildren(live);
    window.renderIcons(el);
    const start = performance.now();
    let done = 0;
    let timer = 0;
    const finish = (complete = true) => {
      clearTimeout(timer);
      streams.delete(el);
      if (complete) { el.replaceChildren(source.content.cloneNode(true)); window.renderIcons(el); }
      el.removeAttribute("aria-busy");
      resolve();
    };
    streams.set(el, { finish });
    el.setAttribute("aria-busy", "true");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
    // A word and the space after it are two steps, so the rate stays in words per second.
    const tick = () => {
      const due = Math.min(steps.length, Math.floor(((performance.now() - start) / 1000) * rate * 2));
      while (done < due) steps[done++]();
      if (done >= steps.length) return finish();
      timer = setTimeout(tick, 1000 / rate / 2);
    };
    tick();
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest?.('.stream[aria-busy="true"]');
    if (el) streams.get(el)?.finish();
  });

  // Typing: the three dots dance a 12 s loop on one line, each figure melting into the next:
  // wave, ping-pong, wave, Newton's cradle. Every figure gets 2.4 s, every blend 0.6 s.
  // Each figure is a function of time, so a blend runs both at once and the dots never stop mid-move.
  // One keyframe track per dot, computed once and shared by every indicator. Reduced motion keeps the dots still.
  const ROUTINE = ["wave", "pong", "wave", "pendulum"], FIGURE = 3000, DANCE = ROUTINE.length * FIGURE;
  const figures = {
    wave: (i, t) => {
      const p = (((t - i * 160) / 1200) % 1 + 1) % 1, up = p < 0.6 ? Math.sin((Math.PI * p) / 0.6) : 0;
      return [(i - 1) * 8, -3 * up, 1, 0.3 + 0.7 * up];
    },
    // The middle dot hops between the outer two, which swell on each hit.
    pong: (i, t) => {
      const u = (t / 1200) % 1;
      if (i === 1) { const h = (u * 2) % 1; return [u < 0.5 ? -8 + 16 * h : 8 - 16 * h, -20 * h * (1 - h), 1, 1]; }
      const hit = Math.max(0, 1 - ((u - (i ? 0.5 : 0) + 1) % 1) / 0.25);
      return [i ? 13 : -13, 0, 1 + 0.35 * hit, 0.45 + 0.55 * hit];
    },
    // Newton's cradle: the outer dots swing out in turn and fall back, fastest at the hit. The middle one stays,
    // and each hit flashes it and nudges it the way the momentum goes, like the pong paddles.
    pendulum: (i, t) => {
      const u = (t / 1200) % 1, side = i - 1, hit = Math.max(0, 1 - ((u * 2) % 1) / 0.25);
      if (!side) return [(u < 0.5 ? -1.5 : 1.5) * hit, 0, 1 + 0.35 * hit, 0.55 + 0.45 * hit];
      const swing = (side < 0) === (u < 0.5) ? Math.sin(Math.PI * ((u * 2) % 1)) : 0;
      return [side * (8 + 6 * swing), -3 * swing * swing, 1, 0.55 + 0.45 * swing];
    },
  };
  const blend = (a, b, from, to, t) => {
    const x = Math.min(1, Math.max(0, (t - from) / (to - from))), w = x * x * (3 - 2 * x);
    return a.map((v, k) => v + (b[k] - v) * w);
  };
  const danceAt = (i, t) => {
    const k = Math.min(ROUTINE.length - 1, Math.floor(t / FIGURE)), next = ROUTINE[(k + 1) % ROUTINE.length];
    return blend(figures[ROUTINE[k]](i, t), figures[next](i, t), (k + 1) * FIGURE - 600, (k + 1) * FIGURE, t);
  };
  let dance;
  const startDance = (dots) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || dots.firstElementChild?.getAnimations().length) return;
    dance ??= [0, 1, 2].map((i) => Array.from({ length: 361 }, (_, k) => {
      const [x, y, s, o] = danceAt(i, (k / 360) * DANCE);
      return { transform: `translate(${x - (i - 1) * 8}px, ${y}px) scale(${s})`, opacity: o };
    }));
    [...dots.children].slice(0, 3).forEach((dot, i) => dot.animate(dance[i], { duration: DANCE, iterations: Infinity }));
  };

  // Steps: each row gets its mark (spinner, check, cross); CSS shows the one matching data-state.
  const buildSteps = (list) => {
    for (const li of list.children) {
      if (!li.querySelector(".steps__mark")) li.insertAdjacentHTML("afterbegin", '<span class="steps__mark" aria-hidden="true"><span class="steps__spinner"></span><i class="icon" data-icon="check"></i><i class="icon" data-icon="x"></i></span>');
    }
    window.renderIcons(list);
  };
  // Divider: the two rules on each side of the label are real elements, so Copy to Figma keeps them.
  const buildDivider = (el) => {
    if (el.querySelector(".divider__line")) return;
    const line = () => Object.assign(document.createElement("span"), { className: "divider__line", ariaHidden: "true" });
    el.prepend(line());
    el.append(line());
  };
  // Steps: setSteps(list, current, failed) marks a run. Before current: done. current: active, or failed when failed is
  // true, and nothing after a failure pretends to have run. current = number of steps: the run is complete.
  window.setSteps = (list, current, failed = false) => {
    [...list.children].forEach((li, i) => {
      const state = i < current ? "done" : i === current ? (failed ? "failed" : "active") : null;
      state ? (li.dataset.state = state) : li.removeAttribute("data-state");
      i === current ? li.setAttribute("aria-current", "step") : li.removeAttribute("aria-current");
    });
    current < list.children.length && !failed ? list.setAttribute("aria-busy", "true") : list.removeAttribute("aria-busy");
  };

  // Progress: setProgress(el, value, max = 100). The fill and the readout both use the whole percent, so they never
  // disagree. value null = total not known yet: the fill crawls towards a third and the readout says data-working.
  // Reaching 100 is announced once.
  window.setProgress = (el, value, max = 100) => {
    const readout = el.querySelector(".progress__value");
    const bar = el.querySelector('[role="progressbar"]');
    if (value == null) {
      el.dataset.state = "unknown";
      readout.textContent = el.dataset.working || "Working";
      bar.removeAttribute("aria-valuenow");
      return;
    }
    const pct = Math.round((Math.min(max, Math.max(0, value)) / max) * 100);
    const done = pct === 100;
    if (done && el.dataset.state !== "done") announce(`${el.querySelector(".progress__label")?.textContent ?? "Progress"}: complete`);
    done ? (el.dataset.state = "done") : el.removeAttribute("data-state");
    el.style.setProperty("--progress", pct);
    readout.textContent = `${pct}%`;
    bar.setAttribute("aria-valuenow", pct);
  };

  // Pagination: <nav class="pagination" data-pages="24" data-page="1">. ds.js draws previous, 7 slots and next; a slot
  // is a page or a gap, and every slot is as wide as the largest number, so the arrows never move. Fires "change".
  const renderPagination = (nav) => {
    const pages = Math.max(1, +nav.dataset.pages || 1);
    const page = Math.min(pages, Math.max(1, +nav.dataset.page || 1));
    if (nav.renderedPage === `${page}/${pages}`) return;
    nav.renderedPage = `${page}/${pages}`;
    nav.style.setProperty("--digits", String(pages).length);
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const slots = pages <= 7 ? range(1, pages)
      : page <= 4 ? [...range(1, 5), "…", pages]
      : page >= pages - 3 ? [1, "…", ...range(pages - 4, pages)]
      : [1, "…", page - 1, page, page + 1, "…", pages];
    if (!nav.querySelector(".pagination__pages")) {
      nav.innerHTML = '<button class="btn" data-variant="icon" data-step="-1" aria-label="Previous page"><i class="icon" data-icon="caret-left"></i></button><span class="pagination__pages" style="display:contents"></span><button class="btn" data-variant="icon" data-step="1" aria-label="Next page"><i class="icon" data-icon="caret-right"></i></button>';
      if (!nav.hasAttribute("aria-label")) nav.setAttribute("aria-label", "Pagination");
      window.renderIcons(nav);
    }
    nav.querySelector('[data-step="-1"]').disabled = page === 1;
    nav.querySelector('[data-step="1"]').disabled = page === pages;
    nav.querySelector(".pagination__pages").innerHTML = slots
      .map((n) => (n === "…" ? '<span class="pagination__gap" aria-hidden="true">…</span>' : `<button class="btn" data-to="${n}" aria-label="Page ${n}"${n === page ? ' aria-current="page"' : ""}>${n}</button>`))
      .join("");
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.(".pagination .btn");
    if (!b) return;
    const nav = b.closest(".pagination");
    const page = b.dataset.to ? +b.dataset.to : +nav.dataset.page + +b.dataset.step;
    nav.dataset.page = page;
    renderPagination(nav);
    if (b.dataset.to) nav.querySelector('[aria-current="page"]').focus();
    nav.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: page }));
  });

  // Sortable table: .table[data-sortable]. Each header becomes a button: ascending, descending, then the original order.
  // A cell's data-value sorts instead of its text. Rows glide from their old place to the new one.
  const initTable = (table) => {
    [...table.tBodies[0].rows].forEach((row, i) => { row.dataset.order ??= i; });
    for (const th of table.tHead.rows[0].cells) {
      if (th.dataset.sort === "false" || th.querySelector("button")) continue;
      const b = document.createElement("button");
      b.append(...th.childNodes);
      th.append(b);
      th.setAttribute("aria-sort", "none");
    }
    for (const b of table.tHead.querySelectorAll("th[aria-sort] button")) {
      if (!b.querySelector(".table__sort")) b.insertAdjacentHTML("beforeend", '<span class="table__sort" aria-hidden="true">↕</span>');
    }
  };
  const SORT_MARKS = { none: "↕", ascending: "↑", descending: "↓" };
  const sortKey = (cell) => {
    const text = (cell.dataset.value ?? cell.textContent).trim();
    const n = Number(text.replace(/−/g, "-").replace(/[,\s%]/g, ""));
    return text && !Number.isNaN(n) ? n : text.toLowerCase();
  };
  document.addEventListener("click", (e) => {
    const th = e.target.closest?.(".table[data-sortable] th[aria-sort]");
    if (!th || !e.target.closest("button")) return;
    const table = th.closest("table");
    const body = table.tBodies[0];
    const rows = [...body.rows];
    const next = { none: "ascending", ascending: "descending", descending: "none" }[th.getAttribute("aria-sort")];
    table.tHead.querySelectorAll("th[aria-sort]").forEach((h) => h.setAttribute("aria-sort", "none"));
    th.setAttribute("aria-sort", next);
    table.tHead.querySelectorAll("th[aria-sort]").forEach((h) => { const mark = h.querySelector(".table__sort"); if (mark) mark.textContent = SORT_MARKS[h.getAttribute("aria-sort")]; });
    const col = th.cellIndex;
    const dir = next === "descending" ? -1 : 1;
    const sorted = next === "none" ? [...rows].sort((a, b) => a.dataset.order - b.dataset.order) : [...rows].sort((a, b) => {
      const x = sortKey(a.cells[col]);
      const y = sortKey(b.cells[col]);
      return (typeof x === typeof y ? (x < y ? -1 : x > y ? 1 : 0) : typeof x === "number" ? -1 : 1) * dir;
    });
    const before = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
    body.append(...sorted);
    const root = getComputedStyle(document.documentElement);
    const duration = parseFloat(root.getPropertyValue("--duration-slow"));
    if (!duration) return;
    for (const r of sorted) {
      const dy = before.get(r) - r.getBoundingClientRect().top;
      if (dy) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration, easing: root.getPropertyValue("--ease-out").trim() });
    }
  });

  // Scroll spy: .toc[data-spy] marks with aria-current the link of the section crossing the reading line, data-spy-offset px
  // from the top (96; set it to the height of a sticky header). At the very bottom the last section wins, however short.
  // Sticky header: data-stuck once content passes under it.
  const spies = new Set();
  const stickies = new Set();
  const spy = (nav) => {
    const line = +(nav.dataset.spyOffset || 96);
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    const current = atEnd ? links.at(-1) : links.filter((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))?.getBoundingClientRect().top <= line).at(-1) || links[0];
    for (const a of links) a === current ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current");
  };
  const stick = (header) => header.toggleAttribute("data-stuck", scrollY > 0 && header.getBoundingClientRect().top <= 0);
  // Reading progress: .reading-progress[data-for="<id>"] fills as the text with that id passes the reading line, 40% down
  // the window. It sets --read (0 to 1) and aria-valuenow, and fires "change" with detail.read so the page can say more,
  // such as the minutes left.
  const readings = new Set();
  const follow = (bar) => {
    const box = document.getElementById(bar.dataset.for)?.getBoundingClientRect();
    if (!box?.height) return;
    const read = Math.min(1, Math.max(0, (innerHeight * 0.4 - box.top) / box.height));
    if (bar.style.getPropertyValue("--read") === String(read)) return;
    bar.style.setProperty("--read", read);
    bar.setAttribute("aria-valuenow", Math.round(read * 100));
    bar.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { read } }));
  };
  addEventListener("scroll", () => { spies.forEach(spy); stickies.forEach(stick); readings.forEach(follow); }, { passive: true });
  addEventListener("resize", () => readings.forEach(follow));

  // Hold to confirm (interior.dev): .btn[data-hold] for an action that cannot be undone. Holding the pointer, Space or Enter
  // fills it over 1.8 s; letting go drains it 2.5 times faster, and pressing again resumes from what is left. Only a full
  // hold fires "confirm" on the button, then data-confirmed ("Confirmed") shows in full for 1.6 s and the button, its job
  // done, turns disabled for good. A click alone does nothing.
  const HOLD = 1800;
  const HOLD_SHOWN = 1600;
  const DRAIN = 2.5;
  let held = null;
  // The clock decides, the animation only draws: commit runs on a timer from the measured progress, never on a frame.
  const progressOf = (h) => {
    const t = performance.now() - h.since;
    return h.dir > 0 ? Math.min(1, h.from + t / HOLD) : h.dir < 0 ? Math.max(0, h.from - (t * DRAIN) / HOLD) : h.from;
  };
  const drive = (btn, dir) => {
    const h = btn.hold;
    h.from = progressOf(h);
    h.since = performance.now();
    h.dir = dir;
    btn.toggleAttribute("data-holding", dir > 0);
    clearTimeout(h.timer);
    h.anim.currentTime = h.from * HOLD;
    h.anim.playbackRate = dir > 0 ? 1 : -DRAIN;
    h.anim.play();
    if (dir > 0) h.timer = setTimeout(() => commit(btn), (1 - h.from) * HOLD);
  };
  const commit = (btn) => {
    const h = btn.hold;
    held = null;
    Object.assign(h, { dir: 0, from: 1 });
    h.anim.pause();
    h.anim.currentTime = HOLD;
    btn.removeAttribute("data-holding");
    btn.dataset.state = "done";
    btn.dispatchEvent(new Event("confirm", { bubbles: true }));
    announce(btn.querySelector('[data-for="done"]').textContent);
    setTimeout(() => btn.setAttribute("aria-disabled", "true"), HOLD_SHOWN);
  };
  const buildHold = (btn) => {
    const idle = Object.assign(document.createElement("span"), { className: "btn__label" });
    idle.dataset.for = "idle";
    idle.append(...btn.childNodes);
    const done = Object.assign(document.createElement("span"), { className: "btn__label", innerHTML: '<i class="icon" data-icon="check"></i>' });
    done.dataset.for = "done";
    done.append(btn.dataset.confirmed || "Confirmed");
    const fill = Object.assign(document.createElement("span"), { className: "btn__fill" });
    btn.append(fill, idle, done);
    for (const el of btn.children) el.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-label", btn.getAttribute("aria-label") || idle.textContent.trim());
    btn.setAttribute("aria-description", `Press and hold for ${HOLD / 1000} seconds`);
    btn.dataset.state = "idle";
    const anim = fill.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: HOLD, fill: "both" });
    anim.pause();
    btn.hold = { anim, dir: 0, from: 0, since: 0, timer: 0 };
    window.renderIcons(btn);
  };
  const press = (btn) => {
    if (btn.dataset.state !== "idle" || btn.getAttribute("aria-disabled") === "true") return;
    held = btn;
    drive(btn, 1);
    btn.addEventListener("pointerleave", release, { once: true });
  };
  const release = () => {
    const btn = held;
    held = null;
    if (btn?.hold.dir > 0) drive(btn, -1);
  };
  document.addEventListener("pointerdown", (e) => {
    const btn = e.button === 0 && e.target.closest?.(".btn[data-hold]");
    if (btn) press(btn);
  });
  document.addEventListener("keydown", (e) => {
    const btn = (e.key === " " || e.key === "Enter") && !e.repeat && e.target.closest?.(".btn[data-hold]");
    if (btn) { e.preventDefault(); press(btn); }
  });
  for (const type of ["pointerup", "pointercancel", "keyup"]) document.addEventListener(type, () => held && release());

  // Checkbox: the check is drawn in an SVG inside .checkbox__box (two paths: the check, and the dash of indeterminate).
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="checkbox__check" d="M3.5 8.5l3 3 6-7"/><path class="checkbox__dash" d="M4 8h8"/></svg>';
  const buildCheckbox = (box) => { if (!box.firstElementChild) box.innerHTML = CHECK; };

  // Field: the label names the control, the hint and the error describe it, data-invalid sets aria-invalid.
  let fieldIds = 0;
  const idOf = (el) => el.id || (el.id = `field-${++fieldIds}`);
  const syncField = (field) => {
    const control = field.querySelector(":scope > :is(.input, .select, .textarea, .combobox, .tag-input) :is(input, select, textarea)");
    if (!control) return;
    if (field.hasAttribute("data-invalid")) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
  };
  const buildField = (field) => {
    const control = field.querySelector(":scope > :is(.input, .select, .textarea, .combobox, .tag-input) :is(input, select, textarea)");
    const label = field.querySelector(":scope > label.field__label");
    if (control && label) label.htmlFor = idOf(control);
    const notes = [...field.querySelectorAll(":scope > :is(.field__hint, .field__error)")].map(idOf);
    if (control && notes.length) control.setAttribute("aria-describedby", notes.join(" "));
    const error = field.querySelector(":scope > .field__error");
    if (error) error.setAttribute("aria-live", "polite");
    syncField(field);
  };

  // Textarea: data-max="280" caps the length and shows "used / max"; the counter turns critical once full.
  const countText = (box) => {
    const area = box.querySelector("textarea");
    const count = box.querySelector(".textarea__count");
    count.textContent = `${area.value.length} / ${box.dataset.max}`;
    box.toggleAttribute("data-full", area.value.length >= Number(box.dataset.max));
  };
  const buildTextarea = (box) => {
    box.querySelector("textarea").maxLength = Number(box.dataset.max);
    box.append(Object.assign(document.createElement("span"), { className: "textarea__count", ariaHidden: "true" }));
    countText(box);
  };
  document.addEventListener("input", (e) => {
    const box = e.target.closest?.(".textarea[data-max]");
    if (box) countText(box);
  });

  // Composer: Send is enabled once there is text; Enter sends, Shift+Enter breaks the line. Sending fires "send" on the
  // form (event.detail.text) and empties the field; the page sets aria-busy while the agent answers and listens for
  // "stop" from the Stop button.
  const syncComposer = (form) => { form.querySelector(".composer__send").disabled = !form.querySelector(".composer__input").value.trim(); };
  document.addEventListener("input", (e) => {
    const form = e.target.closest?.(".composer");
    if (form) syncComposer(form);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing || !e.target.matches?.(".composer__input")) return;
    e.preventDefault();
    const form = e.target.closest(".composer");
    if (!form.querySelector(".composer__send").disabled && form.getAttribute("aria-busy") !== "true") form.requestSubmit();
  });
  document.addEventListener("submit", (e) => {
    const form = e.target.closest?.(".composer");
    if (!form) return;
    e.preventDefault();
    const field = form.querySelector(".composer__input");
    const text = field.value.trim();
    if (!text || form.getAttribute("aria-busy") === "true") return;
    field.value = "";
    syncComposer(form);
    form.dispatchEvent(new CustomEvent("send", { bubbles: true, detail: { text } }));
  });
  document.addEventListener("click", (e) => {
    const form = e.target.closest?.(".composer");
    if (!form) return;
    if (e.target.closest(".composer__stop")) form.dispatchEvent(new CustomEvent("stop", { bubbles: true }));
    // The whole box is the field: a click on its padding or bar puts the caret in it.
    else if (!e.target.closest("button, a, input, textarea, select")) form.querySelector(".composer__input").focus();
  });

  // Tool call: the status mark (spinner, check, cross) is built once; CSS shows the one matching data-state. Its label
  // follows data-state for screen readers.
  const TOOL_STATES = { running: "Running", done: "Done", failed: "Failed" };
  const syncToolCall = (el) => el.querySelector(".tool-call__status")?.setAttribute("aria-label", TOOL_STATES[el.dataset.state] || "");
  const buildToolCall = (el) => {
    const summary = el.querySelector("summary");
    if (!summary || summary.querySelector(".tool-call__status")) return;
    summary.insertAdjacentHTML("beforeend", '<span class="tool-call__status" role="img"><span class="tool-call__spinner"></span><i class="icon" data-icon="check-circle"></i><i class="icon" data-icon="x-circle"></i></span>');
    syncToolCall(el);
    window.renderIcons(summary);
  };

  // Dropzone: files dropped on it or picked through its input. Files that do not match the input's accept, or weigh
  // more than data-max-mb, are refused: the zone flashes data-invalid. Accepted files fire "files" (event.detail.files).
  const takeFiles = (zone, list) => {
    const input = zone.querySelector('input[type="file"]');
    const kinds = (input.accept || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    const fits = (f) => !kinds.length || kinds.some((k) => (k.startsWith(".") ? f.name.toLowerCase().endsWith(k) : k.endsWith("/*") ? f.type.startsWith(k.slice(0, -1)) : f.type === k));
    const max = Number(zone.dataset.maxMb) * 1024 * 1024 || Infinity;
    const files = [...list].filter((f) => fits(f) && f.size <= max);
    zone.removeAttribute("data-invalid");
    if (files.length < list.length) requestAnimationFrame(() => zone.setAttribute("data-invalid", ""));
    if (files.length) zone.dispatchEvent(new CustomEvent("files", { bubbles: true, detail: { files } }));
  };
  for (const type of ["dragenter", "dragover"]) document.addEventListener(type, (e) => {
    const zone = e.target.closest?.(".dropzone");
    if (!zone || zone.querySelector("input:disabled")) return;
    e.preventDefault();
    zone.setAttribute("data-over", "");
  });
  document.addEventListener("dragleave", (e) => {
    const zone = e.target.closest?.(".dropzone");
    if (zone && !zone.contains(e.relatedTarget)) zone.removeAttribute("data-over");
  });
  document.addEventListener("drop", (e) => {
    const zone = e.target.closest?.(".dropzone");
    if (!zone) return;
    e.preventDefault();
    zone.removeAttribute("data-over");
    if (!zone.querySelector("input:disabled")) takeFiles(zone, e.dataTransfer.files);
  });
  document.addEventListener("change", (e) => {
    const zone = e.target.matches?.('.dropzone input[type="file"]') && e.target.closest(".dropzone");
    if (zone) { takeFiles(zone, e.target.files); e.target.value = ""; }
  });

  // Stepper: each stage gets its mark (to do, current, done: three icons, CSS shows one) between two dashed lines.
  const buildStepper = (list) => {
    for (const li of list.children) {
      if (li.querySelector(".stepper__track")) continue;
      li.insertAdjacentHTML("afterbegin", '<span class="stepper__track" aria-hidden="true"><span class="stepper__line"><span class="stepper__fill"></span></span><span class="stepper__mark"><i class="icon" data-icon="circle-dashed"></i><i class="icon" data-icon="circle-half"></i><i class="icon" data-icon="check"></i></span><span class="stepper__line"><span class="stepper__fill"></span></span></span>');
    }
    window.renderIcons(list);
  };

  // Combobox: typing filters the options on their title and detail; the first match is active. ↑ ↓ move, Enter picks,
  // Escape closes, a click picks. Picking writes the title in the field and fires "select" (event.detail: value, option).
  let comboIds = 0;
  const comboParts = (box) => ({ field: box.querySelector("input"), list: box.querySelector(".combobox__list"), options: [...box.querySelectorAll(".combobox__option")], empty: box.querySelector(".combobox__empty") });
  const setActive = (box, option, scroll = false) => {
    const { field, options } = comboParts(box);
    for (const o of options) o.setAttribute("aria-selected", String(o === option));
    option ? field.setAttribute("aria-activedescendant", option.id) : field.removeAttribute("aria-activedescendant");
    if (scroll) option?.scrollIntoView({ block: "nearest" });
  };
  const openCombo = (box, open) => {
    const { field, list } = comboParts(box);
    list.hidden = !open;
    field.setAttribute("aria-expanded", String(open));
  };
  const filterCombo = (box) => {
    const { field, options, empty } = comboParts(box);
    const q = field.value.trim().toLowerCase();
    // Suggestions of a tag input already added as tags stay out of the list until their tag is removed.
    const taken = new Set([...box.querySelectorAll(".tag-input__tag")].map((t) => t.dataset.value.toLowerCase()));
    for (const o of options) o.hidden = (!!q && !o.textContent.toLowerCase().includes(q)) || taken.has((o.dataset.value || o.textContent.trim()).toLowerCase());
    const shown = options.filter((o) => !o.hidden);
    if (empty) empty.hidden = shown.length > 0;
    setActive(box, shown[0]);
  };
  const pickCombo = (box, option) => {
    const { field } = comboParts(box);
    field.value = option.querySelector(".combobox__title")?.textContent || option.textContent.trim();
    openCombo(box, false);
    box.dispatchEvent(new CustomEvent("select", { bubbles: true, detail: { value: option.dataset.value || field.value, option } }));
  };
  const buildCombobox = (box) => {
    const { field, list, options, empty } = comboParts(box);
    if (!field || !list || list.id) return;
    list.id = `combobox-${++comboIds}`;
    list.setAttribute("role", "listbox");
    list.hidden = true;
    Object.assign(field, { autocomplete: "off" });
    field.setAttribute("role", "combobox");
    field.setAttribute("aria-controls", list.id);
    field.setAttribute("aria-autocomplete", "list");
    field.setAttribute("aria-expanded", "false");
    options.forEach((o, i) => { o.id ||= `${list.id}-${i}`; o.setAttribute("role", "option"); o.setAttribute("aria-selected", "false"); });
    if (empty) empty.hidden = true;
  };
  document.addEventListener("input", (e) => {
    const box = e.target.closest?.(".combobox");
    if (!box) return;
    openCombo(box, true);
    filterCombo(box);
  });
  document.addEventListener("focusin", (e) => {
    const box = e.target.matches?.(".combobox input") && e.target.closest(".combobox");
    if (box) { openCombo(box, true); filterCombo(box); }
  });
  document.addEventListener("focusout", (e) => {
    const box = e.target.matches?.(".combobox input") && e.target.closest(".combobox");
    if (box && !box.contains(e.relatedTarget)) openCombo(box, false);
  });
  document.addEventListener("keydown", (e) => {
    const box = e.target.matches?.(".combobox input") && e.target.closest(".combobox");
    if (!box) return;
    const { list, options } = comboParts(box);
    const shown = options.filter((o) => !o.hidden);
    const at = shown.findIndex((o) => o.getAttribute("aria-selected") === "true");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) { openCombo(box, true); filterCombo(box); return; }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive(box, shown[(at + step + shown.length) % shown.length], true);
    } else if (e.key === "Enter" && !list.hidden && shown[at]) {
      e.preventDefault();
      pickCombo(box, shown[at]);
    } else if (e.key === "Escape" && !list.hidden) {
      e.preventDefault();
      openCombo(box, false);
    }
  });
  // mousedown, not click: the field keeps the focus, so focusout does not close the list before the pick.
  document.addEventListener("mousedown", (e) => {
    const option = e.target.closest?.(".combobox__option");
    if (!option) return;
    e.preventDefault();
    pickCombo(option.closest(".combobox"), option);
  });
  document.addEventListener("mousemove", (e) => {
    const option = e.target.closest?.(".combobox__option");
    if (option && option.getAttribute("aria-selected") !== "true") setActive(option.closest(".combobox"), option);
  });

  // Carousel: each arrow scrolls its carousel (aria-controls) by one card and is disabled at its end. Slides are numbered
  // for screen readers ("2 of 6"); the track keeps its native scrolling.
  const carouselArrows = (track) => document.querySelectorAll(`[data-carousel][aria-controls="${track.id}"]`);
  const syncCarousel = (track) => {
    const end = track.scrollWidth - track.clientWidth - 1;
    for (const b of carouselArrows(track)) b.disabled = b.dataset.carousel === "prev" ? track.scrollLeft <= 1 : track.scrollLeft >= end;
  };
  const buildCarousel = (track) => {
    if (track.hasAttribute("aria-roledescription")) return;
    track.setAttribute("aria-roledescription", "carousel");
    track.tabIndex = 0;
    const items = [...track.children];
    items.forEach((item, i) => {
      item.setAttribute("role", "group");
      item.setAttribute("aria-roledescription", "slide");
      item.setAttribute("aria-label", `${i + 1} of ${items.length}`);
    });
    track.addEventListener("scroll", () => syncCarousel(track), { passive: true });
    new ResizeObserver(() => syncCarousel(track)).observe(track);
    syncCarousel(track);
  };
  document.addEventListener("click", (e) => {
    const arrow = e.target.closest?.("[data-carousel]");
    const track = arrow && document.getElementById(arrow.getAttribute("aria-controls"));
    if (!track) return;
    const step = (track.firstElementChild?.getBoundingClientRect().width || track.clientWidth) + parseFloat(getComputedStyle(track).columnGap || 0);
    track.scrollBy({ left: arrow.dataset.carousel === "prev" ? -step : step });
  });

  // Banner: [data-dismiss] inside a .banner folds it away, then removes it and fires "dismiss" on the parent.
  document.addEventListener("click", (e) => {
    const banner = e.target.closest?.(".banner [data-dismiss]")?.closest(".banner");
    if (!banner || banner.hasAttribute("data-leaving")) return;
    const parent = banner.parentElement;
    banner.setAttribute("data-leaving", "");
    const done = () => { banner.remove(); parent?.dispatchEvent(new CustomEvent("dismiss", { bubbles: true, detail: banner })); };
    banner.addEventListener("animationend", (a) => a.animationName === "banner-out" && done());
    if (!parseFloat(getComputedStyle(banner).animationDuration)) done();
  });

  // Number stepper: the arrows of .input__stepper step the number field of their .input, within its min, max and step.
  // They stay out of the Tab order: on the field, ↑ and ↓ do the same natively.
  document.addEventListener("click", (e) => {
    const arrow = e.target.closest?.(".input__stepper [data-step]");
    const field = arrow?.closest(".input")?.querySelector('input[type="number"]');
    if (!field || field.disabled) return;
    const before = field.value;
    arrow.dataset.step === "up" ? field.stepUp() : field.stepDown();
    if (field.value === before) return;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // App shell: [data-shell-toggle] folds the navigation rail to icons and back. Its aria-expanded follows.
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest?.("[data-shell-toggle]");
    const shell = toggle && (toggle.closest(".shell") || document.querySelector(".shell"));
    if (!shell) return;
    const collapsed = shell.toggleAttribute("data-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
  });

  // Rich editor: a contenteditable area with a toolbar, built from data-placeholder, data-hint and data-max. Formatting
  // goes through document.execCommand: deprecated, but the only dependency-free way to keep the native undo stack.
  // Fires "input" and "change" on the root with detail { html, text }.
  const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";
  const RICH_TOOLS = [
    ["bold", "text-b", "Bold", "B"], ["italic", "text-italic", "Italic", "I"], ["underline", "text-underline", "Underline", "U"], null,
    ["bullets", "list-bullets", "Bulleted list"], ["numbers", "list-numbers", "Numbered list"], null,
    ["link", "link-simple", "Link", "K"], ["undo", "arrow-counter-clockwise", "Undo", "Z"], ["redo", "arrow-clockwise", "Redo", "⇧Z"],
  ];
  const RICH_COMMANDS = { bold: "bold", italic: "italic", underline: "underline", bullets: "insertUnorderedList", numbers: "insertOrderedList", undo: "undo", redo: "redo" };
  const RICH_KEYS = { b: "bold", i: "italic", u: "underline", k: "link", z: "undo", y: "redo" };
  const richEditors = new WeakMap();
  const buildRichEditor = (root) => {
    const content = root.innerHTML;
    const max = Number(root.dataset.max) || 0;
    const tools = RICH_TOOLS.map((t) => {
      if (!t) return '<span class="rich-editor__separator"></span>';
      const [name, icon, label, key] = t;
      const toggle = name !== "undo" && name !== "redo";
      return `<button type="button" class="btn" data-variant="icon" data-format="${name}" aria-label="${label}" data-tip="${key ? `${label} ${MOD}${key}` : label}"${toggle ? ' aria-pressed="false"' : ""} tabindex="-1"><i class="icon" data-icon="${icon}"></i></button>`;
    }).join("");
    root.innerHTML = `<div class="rich-editor__box"><div class="rich-editor__toolbar" role="toolbar" aria-label="Formatting">${tools}</div>`
      + '<div class="rich-editor__area" contenteditable="true" role="textbox" aria-multiline="true"></div><div class="rich-editor__placeholder" aria-hidden="true"></div>'
      + '<div class="popover rich-editor__link" hidden><label class="input"><i class="icon" data-icon="link-simple"></i><input type="url" placeholder="https://" aria-label="Link address"></label>'
      + '<div class="popover__foot"><button type="button" class="btn" data-variant="ghost" data-link="remove">Remove</button><button type="button" class="btn" data-variant="primary" data-link="apply">Apply</button></div></div></div>'
      + (root.dataset.hint || max ? `<div class="rich-editor__foot"><span>${root.dataset.hint || ""}</span>${max ? '<span class="rich-editor__count" aria-hidden="true"></span>' : ""}</div>` : "");
    const $ = (s) => root.querySelector(s);
    const area = $(".rich-editor__area");
    const pop = $(".rich-editor__link");
    const url = pop.querySelector("input");
    const buttons = [...root.querySelectorAll(".rich-editor__toolbar .btn")];
    const linkBtn = $('[data-format="link"]');
    area.innerHTML = content;
    $(".rich-editor__placeholder").textContent = root.dataset.placeholder || "";
    if (root.dataset.placeholder) area.setAttribute("aria-placeholder", root.dataset.placeholder);
    if (root.hasAttribute("aria-label")) { area.setAttribute("aria-label", root.getAttribute("aria-label")); root.removeAttribute("aria-label"); }
    let current = buttons[0];
    let range = null;
    let link = null;
    let committed = area.innerHTML;
    const value = () => ({ html: area.innerHTML, text: area.innerText });
    const anchor = () => { const n = range?.startContainer; return (n?.nodeType === 1 ? n : n?.parentElement)?.closest(".rich-editor__area a"); };
    // Back to the area with the selection it had, unless the caret is still there (keyboard shortcuts).
    const restore = () => {
      if (document.activeElement === area) return;
      area.focus();
      if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); }
    };
    const measure = () => {
      const length = area.textContent.length;
      root.toggleAttribute("data-empty", !length && !area.querySelector("ul, ol"));
      if (!max) return;
      $(".rich-editor__count").textContent = `${length.toLocaleString("en")} / ${max.toLocaleString("en")}`;
      root.toggleAttribute("data-full", length >= max);
    };
    const save = () => {
      const s = getSelection();
      if (s.rangeCount && area.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange();
    };
    // Called on selectionchange inside the area: keeps the range for the toolbar and the pressed states in step.
    const sync = () => {
      save();
      for (const b of buttons) {
        if (!b.hasAttribute("aria-pressed")) continue;
        const on = b === linkBtn ? !!anchor() : document.queryCommandState(RICH_COMMANDS[b.dataset.format]);
        b.setAttribute("aria-pressed", String(on));
      }
    };
    const closeLink = (refocus) => {
      if (pop.hidden) return;
      pop.hidden = true;
      if (refocus) restore();
    };
    const openLink = () => {
      save();
      link = anchor();
      url.value = link?.getAttribute("href") || "";
      pop.querySelector('[data-link="remove"]').hidden = !link;
      pop.hidden = false;
      pop.style.left = `${Math.max(0, Math.min(linkBtn.offsetLeft, root.offsetWidth - pop.offsetWidth))}px`;
      url.focus();
      url.select();
    };
    const selectLink = () => {
      if (!link?.isConnected) return;
      const s = getSelection();
      const r = document.createRange();
      r.selectNodeContents(link);
      s.removeAllRanges();
      s.addRange(r);
    };
    const applyLink = () => {
      let href = url.value.trim();
      if (href && !/^(https?:|mailto:|tel:|\/|#)/i.test(href)) href = `https://${href}`;
      closeLink(true);
      if (!href) return;
      selectLink();
      if (!getSelection().isCollapsed) return document.execCommand("createLink", false, href);
      const a = document.createElement("a");
      a.setAttribute("href", href);
      a.textContent = href;
      document.execCommand("insertHTML", false, a.outerHTML);
    };
    const act = (name) => {
      if (name === "link") return openLink();
      restore();
      document.execCommand(RICH_COMMANDS[name]);
    };
    // Markdown at the start of a line: "- " or "* " starts a bulleted list, "1. " a numbered one.
    const markdown = () => {
      const s = getSelection();
      const node = s.anchorNode;
      if (!s.isCollapsed || node.nodeType !== 3 || node.parentElement.closest("li")) return;
      const line = document.createRange();
      const block = node.parentElement.closest("div, p");
      line.setStart(block !== area && area.contains(block) ? block : area, 0);
      line.setEnd(node, s.anchorOffset);
      const text = line.toString();
      const list = /^[-*]\s$/.test(text) ? "insertUnorderedList" : /^1\.\s$/.test(text) ? "insertOrderedList" : "";
      if (!list) return;
      s.removeAllRanges();
      s.addRange(line);
      document.execCommand("delete");
      document.execCommand(list);
    };
    const syncState = () => {
      const disabled = root.getAttribute("aria-disabled") === "true";
      area.contentEditable = String(!disabled);
      if (disabled) area.setAttribute("aria-disabled", "true");
      else area.removeAttribute("aria-disabled");
      for (const b of buttons) b.tabIndex = !disabled && b === current ? 0 : -1;
      const field = root.closest(".field");
      if (field?.hasAttribute("data-invalid")) area.setAttribute("aria-invalid", "true");
      else area.removeAttribute("aria-invalid");
    };

    // Toolbar: mousedown keeps the selection in the area; one tab stop, ← → Home End move along the buttons.
    $(".rich-editor__toolbar").addEventListener("mousedown", (e) => e.preventDefault());
    $(".rich-editor__toolbar").addEventListener("click", (e) => {
      const b = e.target.closest("[data-format]");
      if (b) act(b.dataset.format);
    });
    $(".rich-editor__toolbar").addEventListener("keydown", (e) => {
      const i = buttons.indexOf(document.activeElement);
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
      if (i < 0 || next === undefined) return;
      e.preventDefault();
      current = buttons[(next + buttons.length) % buttons.length];
      syncState();
      current.focus();
    });
    area.addEventListener("keydown", (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const name = key === "z" && e.shiftKey ? "redo" : e.shiftKey ? null : RICH_KEYS[key];
      if (!name) return;
      e.preventDefault();
      act(name);
    });
    // data-max caps typed and pasted text; pasting keeps the words, not the formatting of the source.
    const room = () => max - area.textContent.length + getSelection().toString().length;
    area.addEventListener("beforeinput", (e) => {
      if (max && e.inputType === "insertText" && e.data && e.data.length > room()) e.preventDefault();
    });
    area.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, max ? text.slice(0, Math.max(0, room())) : text);
    });
    area.addEventListener("input", (e) => {
      e.stopPropagation();
      if (e.inputType === "insertText" && e.data === " ") markdown();
      measure();
      root.dispatchEvent(new CustomEvent("input", { bubbles: true, detail: value() }));
    });
    area.addEventListener("focusin", () => closeLink(false));
    root.addEventListener("focusout", (e) => {
      if (root.contains(e.relatedTarget)) return;
      closeLink(false);
      if (area.innerHTML === committed) return;
      committed = area.innerHTML;
      root.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: value() }));
    });
    url.addEventListener("input", (e) => e.stopPropagation());
    pop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target === url) { e.preventDefault(); applyLink(); }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeLink(true); }
    });
    pop.addEventListener("click", (e) => {
      const action = e.target.closest("[data-link]")?.dataset.link;
      if (action === "apply") applyLink();
      if (action === "remove") { closeLink(true); selectLink(); document.execCommand("unlink"); }
    });
    const field = root.closest(".field");
    const label = field?.querySelector(":scope > .field__label");
    if (label) {
      area.setAttribute("aria-labelledby", idOf(label));
      label.addEventListener("click", () => area.focus());
    }
    const notes = field ? [...field.querySelectorAll(":scope > :is(.field__hint, .field__error)")].map(idOf) : [];
    if (notes.length) area.setAttribute("aria-describedby", notes.join(" "));
    const watch = new MutationObserver(syncState);
    watch.observe(root, { attributes: true, attributeFilter: ["aria-disabled"] });
    if (field) watch.observe(field, { attributes: true, attributeFilter: ["data-invalid"] });
    richEditors.set(area, sync);
    syncState();
    measure();
    window.renderIcons(root);
  };
  document.addEventListener("selectionchange", () => {
    const n = getSelection().anchorNode;
    const area = (n?.nodeType === 1 ? n : n?.parentElement)?.closest(".rich-editor__area");
    if (area) richEditors.get(area)?.();
  });

  // Date picker: a field that opens a month calendar, built from data-value, data-min, data-max (ISO dates) and
  // data-placeholder. The days are an ARIA grid with one tab stop: ← → move a day, ↑ ↓ a week, PageUp PageDown a month,
  // Home End to the start and end of the week, Enter or Space picks, Escape closes. Picking fires "change" on the root
  // (event.detail.value, the ISO date). Weeks start on Monday; names come from the page language.
  const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dateOf = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    const d = m && new Date(+m[1], m[2] - 1, +m[3]);
    return d && d.getMonth() === m[2] - 1 ? d : null;
  };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  // Same day in another month, or its last day when the month is shorter (31 January → 28 February).
  const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate()));
  const dayOfWeek = (d) => (d.getDay() + 6) % 7;
  const pickerBounds = (root) => [dateOf(root.dataset.min), dateOf(root.dataset.max)];
  const clampDate = (root, d) => { const [min, max] = pickerBounds(root); return min && d < min ? min : max && d > max ? max : d; };
  let pickerIds = 0;
  let openPicker = null;
  const syncDatePicker = (root) => {
    const { field, format } = root.picker;
    const value = dateOf(root.dataset.value);
    const text = value ? format.short.format(value) : root.dataset.placeholder || "";
    root.querySelector(".date-picker__value").textContent = text;
    root.toggleAttribute("data-empty", !value);
    const label = root.closest(".field")?.querySelector(":scope > .field__label")?.textContent.trim() || root.picker.name;
    field.setAttribute("aria-label", label ? `${label}, ${text}` : text);
    field.disabled = root.getAttribute("aria-disabled") === "true";
    if (root.closest(".field")?.hasAttribute("data-invalid")) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    if (openPicker === root) renderMonth(root);
  };
  // The 42 day buttons are built once and rewritten in place, so the focused one never leaves the page.
  const renderMonth = (root, swap) => {
    const { focus, format, calendar } = root.picker;
    const [min, max] = pickerBounds(root);
    const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
    const start = addDays(first, -dayOfWeek(first));
    const today = isoOf(new Date());
    calendar.querySelectorAll(".date-picker__day").forEach((b, i) => {
      const d = addDays(start, i);
      const iso = isoOf(d);
      b.dataset.date = iso;
      b.textContent = d.getDate();
      b.setAttribute("aria-label", format.full.format(d));
      b.tabIndex = iso === isoOf(focus) ? 0 : -1;
      b.toggleAttribute("data-outside", d.getMonth() !== first.getMonth());
      iso === today ? b.setAttribute("aria-current", "date") : b.removeAttribute("aria-current");
      (min && d < min) || (max && d > max) ? b.setAttribute("aria-disabled", "true") : b.removeAttribute("aria-disabled");
      iso === root.dataset.value ? b.parentElement.setAttribute("aria-selected", "true") : b.parentElement.removeAttribute("aria-selected");
    });
    calendar.querySelector(".date-picker__title").textContent = format.month.format(first);
    calendar.querySelector('[data-month="-1"]').disabled = !!min && addDays(first, -1) < min;
    calendar.querySelector('[data-month="1"]').disabled = !!max && new Date(first.getFullYear(), first.getMonth() + 1, 1) > max;
    if (swap) {
      calendar.removeAttribute("data-swap");
      void calendar.offsetWidth; // restarts the swap when months change quickly
      calendar.setAttribute("data-swap", "");
    }
  };
  // Moves the grid's tab stop to a day (kept within data-min and data-max); a day of another month shows that month.
  const moveToDay = (root, d, focus = true) => {
    const target = clampDate(root, d);
    const swap = target.getMonth() !== root.picker.focus.getMonth() || target.getFullYear() !== root.picker.focus.getFullYear();
    root.picker.focus = target;
    renderMonth(root, swap);
    if (focus) root.picker.calendar.querySelector(`[data-date="${isoOf(target)}"]`).focus();
  };
  const closeDatePicker = (refocus) => {
    if (!openPicker) return;
    const { field, calendar } = openPicker.picker;
    openPicker = null;
    calendar.hidden = true;
    field.setAttribute("aria-expanded", "false");
    if (refocus) field.focus();
  };
  const openDatePicker = (root) => {
    closeDatePicker();
    const { field, calendar } = root.picker;
    root.picker.focus = clampDate(root, dateOf(root.dataset.value) || new Date());
    calendar.removeAttribute("data-swap");
    openPicker = root;
    renderMonth(root);
    calendar.hidden = false;
    // Below the field, above it when only there is room; aligned on its right edge when the right side is short.
    const r = field.getBoundingClientRect();
    const below = r.bottom + 4 + calendar.offsetHeight <= innerHeight || r.top - 4 - calendar.offsetHeight < 0;
    calendar.dataset.side = below ? "bottom" : "top";
    r.left + calendar.offsetWidth > innerWidth - 8 ? (calendar.dataset.align = "end") : delete calendar.dataset.align;
    field.setAttribute("aria-expanded", "true");
    calendar.querySelector('.date-picker__day[tabindex="0"]').focus();
  };
  const pickDate = (root, iso) => {
    const changed = root.dataset.value !== iso;
    root.dataset.value = iso;
    syncDatePicker(root);
    closeDatePicker(true);
    if (changed) root.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { value: iso } }));
  };
  const buildDatePicker = (root) => {
    const id = `date-picker-${++pickerIds}`;
    const lang = root.closest("[lang]")?.lang || undefined;
    const fmt = (options) => new Intl.DateTimeFormat(lang, options);
    const week = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i)); // 1 January 2024 is a Monday
    const days = Array.from({ length: 6 }, () => `<tr>${'<td><button type="button" class="date-picker__day" tabindex="-1"></button></td>'.repeat(7)}</tr>`).join("");
    root.innerHTML = `<button type="button" class="input date-picker__field" id="${id}-field" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}"><i class="icon" data-icon="calendar-blank"></i><span class="date-picker__value"></span></button>`
      + `<div class="popover date-picker__calendar" id="${id}" role="dialog" aria-label="Choose a date" hidden><div class="date-picker__head">`
      + '<button type="button" class="btn" data-variant="icon" data-month="-1" aria-label="Previous month"><i class="icon" data-icon="caret-left"></i></button>'
      + `<span class="date-picker__title" id="${id}-title" aria-live="polite"></span>`
      + '<button type="button" class="btn" data-variant="icon" data-month="1" aria-label="Next month"><i class="icon" data-icon="caret-right"></i></button></div>'
      + `<table class="date-picker__grid" role="grid" aria-labelledby="${id}-title"><thead><tr>${week.map((d) => `<th scope="col" abbr="${fmt({ weekday: "long" }).format(d)}">${fmt({ weekday: "short" }).format(d)}</th>`).join("")}</tr></thead><tbody>${days}</tbody></table></div>`;
    root.picker = {
      field: root.querySelector(".date-picker__field"),
      calendar: root.querySelector(".date-picker__calendar"),
      name: root.getAttribute("aria-label"),
      focus: new Date(),
      format: { short: fmt({ day: "numeric", month: "short", year: "numeric" }), full: fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }), month: fmt({ month: "long", year: "numeric" }) },
    };
    root.removeAttribute("aria-label");
    const field = root.closest(".field");
    const label = field?.querySelector(":scope > label.field__label");
    if (label) label.htmlFor = root.picker.field.id;
    const notes = field ? [...field.querySelectorAll(":scope > :is(.field__hint, .field__error)")].map(idOf) : [];
    if (notes.length) root.picker.field.setAttribute("aria-describedby", notes.join(" "));
    const watch = new MutationObserver(() => syncDatePicker(root));
    watch.observe(root, { attributes: true, attributeFilter: ["data-value", "data-min", "data-max", "data-placeholder", "aria-disabled"] });
    if (field) watch.observe(field, { attributes: true, attributeFilter: ["data-invalid"] });
    syncDatePicker(root);
    window.renderIcons(root);
  };
  document.addEventListener("click", (e) => {
    const root = e.target.closest?.(".date-picker");
    if (!root?.picker) return;
    if (e.target.closest(".date-picker__field")) openPicker === root ? closeDatePicker(true) : openDatePicker(root);
    const month = e.target.closest("[data-month]");
    if (month) moveToDay(root, addMonths(root.picker.focus, +month.dataset.month), false);
    const day = e.target.closest(".date-picker__day");
    if (day && day.getAttribute("aria-disabled") !== "true") pickDate(root, day.dataset.date);
  });
  document.addEventListener("keydown", (e) => {
    const root = e.target.closest?.(".date-picker");
    if (!root?.picker) return;
    if (e.target === root.picker.field) {
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && openPicker !== root) { e.preventDefault(); openDatePicker(root); }
      return;
    }
    if (e.key === "Escape") {
      // Stopped here, so a dialog around the picker stays open.
      e.preventDefault();
      e.stopPropagation();
      return closeDatePicker(true);
    }
    if (!e.target.matches(".date-picker__day")) return;
    const focus = root.picker.focus;
    const to = {
      ArrowLeft: addDays(focus, -1), ArrowRight: addDays(focus, 1), ArrowUp: addDays(focus, -7), ArrowDown: addDays(focus, 7),
      PageUp: addMonths(focus, -1), PageDown: addMonths(focus, 1), Home: addDays(focus, -dayOfWeek(focus)), End: addDays(focus, 6 - dayOfWeek(focus)),
    }[e.key];
    if (to) { e.preventDefault(); moveToDay(root, to); }
  });
  document.addEventListener("mousedown", (e) => { if (openPicker && !openPicker.contains(e.target)) closeDatePicker(); });
  document.addEventListener("focusout", (e) => { if (openPicker && e.target.closest?.(".date-picker") === openPicker && e.relatedTarget && !openPicker.contains(e.relatedTarget)) closeDatePicker(); });

  // Command palette: ⌘K or Ctrl+K opens the page's dialog.command-palette and closes it again; data-open works too.
  // Typing filters the items on their title and hides the groups left empty; the first match is active. ↑ ↓ move, Enter
  // or a click runs the active item: the palette closes and fires "select" (event.detail: value, item). Closing clears it.
  // data-select="multiple": Enter or a press adds one to the item's data-count instead (the page may write it too) and
  // the foot shows the cart, kept across closes, with the intents from the first pick: all of them, or only the one named
  // by data-intent (on the opener, else on the palette). An intent closes the palette, fires "confirm" (detail: intent,
  // items of value, title, quantity, item) and empties the cart. A pill's name fires "options".
  let paletteIds = 0;
  const paletteParts = (dialog) => ({ field: dialog.querySelector(".command-palette__search input"), list: dialog.querySelector(".command-palette__list"), items: [...dialog.querySelectorAll(".command-palette__item")] });
  const isMultiple = (dialog) => dialog.dataset.select === "multiple";
  const commandTitle = (item) => (item.querySelector(".command-palette__title") || item).textContent.trim();
  const commandValue = (item) => item.dataset.value ?? commandTitle(item);
  const countOf = (item) => Math.max(0, parseInt(item.dataset.count, 10) || 0);
  // Out of the search, only the visible space counts; a search looks through every space.
  const shownCommands = (dialog) => paletteParts(dialog).items.filter((i) => !i.hidden && !i.closest(".command-palette__group[hidden]") && (dialog.hasAttribute("data-searching") || !i.closest(".tabs__panel[hidden]")));
  const activateCommand = (dialog, item, scroll = false) => {
    const { field, items } = paletteParts(dialog);
    for (const i of items) {
      i.toggleAttribute("data-active", i === item);
      if (!isMultiple(dialog)) i.setAttribute("aria-selected", String(i === item));
    }
    item ? field.setAttribute("aria-activedescendant", item.id) : field.removeAttribute("aria-activedescendant");
    if (scroll) item?.scrollIntoView({ block: "nearest" });
  };
  const filterCommands = (dialog) => {
    const { field, list, items } = paletteParts(dialog);
    const q = field.value.trim().toLowerCase();
    dialog.toggleAttribute("data-searching", !!q);
    for (const i of items) i.hidden = !!q && !commandTitle(i).toLowerCase().includes(q);
    for (const g of dialog.querySelectorAll(".command-palette__group")) g.hidden = !g.querySelector(".command-palette__item:not([hidden])");
    const shown = shownCommands(dialog);
    const empty = dialog.querySelector(".command-palette__empty");
    if (empty) empty.hidden = shown.length > 0;
    list.scrollTop = 0;
    activateCommand(dialog, shown[0]);
  };
  const intentsOf = (dialog) => [...dialog.querySelectorAll(".command-palette__intent")];
  const chosenIntent = (dialog) => {
    const all = intentsOf(dialog);
    return all.length === 1 ? all[0] : all.find((b) => b.dataset.value === dialog.dataset.intent);
  };
  // The cart in the order things were added: the pills keep it, the items are the fallback.
  const cartOf = (dialog) => {
    const cart = dialog.querySelector(".command-palette__cart");
    const items = cart ? [...cart.children].map((l) => l.paletteItem) : paletteParts(dialog).items;
    return items.filter((i) => countOf(i) > 0);
  };
  const syncCart = (dialog) => {
    if (!isMultiple(dialog)) return;
    for (const item of paletteParts(dialog).items) {
      const n = countOf(item);
      if (item.getAttribute("aria-selected") !== String(n > 0)) item.setAttribute("aria-selected", String(n > 0));
      let badge = item.querySelector(".command-palette__count");
      if (!badge) {
        badge = Object.assign(document.createElement("span"), { className: "command-palette__count", hidden: true });
        badge.setAttribute("aria-hidden", "true");
        item.append(badge);
      }
      const before = +badge.textContent || 0;
      if (n === before) continue;
      badge.hidden = !n;
      badge.textContent = n || "";
      if (n > before) { badge.removeAttribute("data-pop"); void badge.offsetWidth; badge.setAttribute("data-pop", ""); }
    }
    const foot = dialog.querySelector(".command-palette__foot");
    if (!foot) return;
    const cart = foot.querySelector(".command-palette__cart");
    if (cart) {
      const lines = new Map([...cart.children].map((l) => [l.paletteItem, l]));
      for (const item of paletteParts(dialog).items.filter((i) => countOf(i) > 0)) {
        let line = lines.get(item);
        lines.delete(item);
        if (!line) {
          line = Object.assign(document.createElement("span"), { className: "command-palette__line", paletteItem: item });
          line.innerHTML = '<button type="button" class="btn" data-variant="icon" data-delta="-1"><i class="icon" data-icon="minus"></i></button><button type="button" class="btn" data-variant="ghost" data-options><span class="command-palette__qty"></span><span></span></button><button type="button" class="btn" data-variant="icon" data-delta="1"><i class="icon" data-icon="plus"></i></button>';
          line.firstChild.setAttribute("aria-label", `${cart.dataset.less || "One less"}: ${commandTitle(item)}`);
          line.lastChild.setAttribute("aria-label", `${cart.dataset.more || "One more"}: ${commandTitle(item)}`);
          line.children[1].lastChild.textContent = commandTitle(item);
          cart.append(line);
          window.renderIcons(line);
        }
        line.querySelector(".command-palette__qty").textContent = countOf(item);
      }
      for (const line of lines.values()) {
        if (line.contains(document.activeElement)) (paletteParts(dialog).field || dialog).focus();
        line.remove();
      }
    }
    const count = cartOf(dialog).length;
    foot.hidden = !count;
    const summary = foot.querySelector(".command-palette__summary");
    if (summary) summary.textContent = (count === 1 ? summary.dataset.one : summary.dataset.other)?.replace("#", count) ?? "";
    // When the context already knows the intent, it is the one big action.
    const chosen = chosenIntent(dialog);
    for (const b of intentsOf(dialog)) b.hidden = !!chosen && b !== chosen;
    foot.querySelector(".command-palette__intents")?.toggleAttribute("data-single", !!chosen);
  };
  const setCount = (dialog, item, n) => {
    n > 0 ? (item.dataset.count = n) : delete item.dataset.count;
    syncCart(dialog);
  };
  const confirmPalette = (dialog, intent) => {
    const items = cartOf(dialog).map((item) => ({ value: commandValue(item), title: commandTitle(item), quantity: countOf(item), item }));
    if (!items.length) return;
    if (dialog.matches(":modal")) dialog.close();
    dialog.dispatchEvent(new CustomEvent("confirm", { bubbles: true, detail: { intent: intent?.dataset.value, items } }));
    for (const { item } of items) delete item.dataset.count;
    syncCart(dialog);
  };
  const runCommand = (dialog, item) => {
    if (isMultiple(dialog)) return setCount(dialog, item, countOf(item) + 1);
    // A palette shown in the page flow (non-modal) stays; the modal one closes before the page acts.
    if (dialog.matches(":modal")) dialog.close();
    dialog.dispatchEvent(new CustomEvent("select", { bubbles: true, detail: { value: commandValue(item), item } }));
  };
  // The intent the palette opens with: the opener's data-intent, else the one written on the palette.
  const openPalette = (dialog, opener) => {
    dialog.paletteIntent ??= dialog.dataset.intent ?? "";
    const intent = opener?.dataset.intent ?? dialog.paletteIntent;
    intent ? (dialog.dataset.intent = intent) : delete dialog.dataset.intent;
    syncCart(dialog);
    // On touch, the keyboard would cover the sheet: the search waits for a tap.
    if (dialog.dataset.variant === "sheet" && matchMedia("(pointer: coarse)").matches) dialog.focus();
  };
  const buildCommandPalette = (dialog) => {
    const { field, list, items } = paletteParts(dialog);
    if (!field || !list || list.id) return;
    list.id = `command-palette-${++paletteIds}`;
    list.setAttribute("role", "listbox");
    if (isMultiple(dialog)) list.setAttribute("aria-multiselectable", "true");
    dialog.tabIndex = -1;
    field.autocomplete = "off";
    field.setAttribute("role", "combobox");
    field.setAttribute("aria-controls", list.id);
    field.setAttribute("aria-autocomplete", "list");
    field.setAttribute("aria-expanded", "true");
    dialog.querySelectorAll(".command-palette__group").forEach((g, i) => {
      g.setAttribute("role", "group");
      const label = g.querySelector(".command-palette__label");
      if (label) g.setAttribute("aria-labelledby", label.id ||= `${list.id}-group-${i}`);
    });
    items.forEach((item, i) => { item.id ||= `${list.id}-${i}`; item.setAttribute("role", "option"); });
    dialog.querySelector(".command-palette__cart")?.setAttribute("aria-live", "polite");
    filterCommands(dialog);
    syncCart(dialog);
  };
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const open = document.querySelector("dialog.command-palette:modal");
    const palette = open || document.querySelector("dialog.command-palette:not([open])");
    if (!palette) return;
    e.preventDefault();
    if (open) return open.close();
    palette.showModal();
    openPalette(palette);
  });
  // After the modal listener: the palette is open by now.
  document.addEventListener("click", (e) => {
    const opener = e.target.closest?.("[data-open]");
    const dialog = opener && document.getElementById(opener.dataset.open);
    if (dialog?.matches(".command-palette")) openPalette(dialog, opener);
  });
  document.addEventListener("input", (e) => {
    const dialog = e.target.matches?.(".command-palette__search input") && e.target.closest(".command-palette");
    if (dialog) filterCommands(dialog);
  });
  document.addEventListener("keydown", (e) => {
    const dialog = e.target.matches?.(".command-palette__search input") && e.target.closest(".command-palette");
    if (!dialog) return;
    const shown = shownCommands(dialog);
    const at = shown.findIndex((i) => i.hasAttribute("data-active"));
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && shown.length) {
      e.preventDefault();
      activateCommand(dialog, shown[(at + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length], true);
    } else if (e.key === "Enter" && !e.isComposing && shown[at]) {
      e.preventDefault();
      runCommand(dialog, shown[at]);
    }
  });
  // Space switches: the first item of the new space becomes active.
  document.addEventListener("change", (e) => {
    const dialog = e.target.matches?.(".command-palette > .tabs") && e.target.closest(".command-palette");
    if (dialog) activateCommand(dialog, shownCommands(dialog)[0]);
  });
  // mousedown, not click: the field keeps the focus, like the combobox.
  document.addEventListener("mousedown", (e) => {
    const item = e.target.closest?.(".command-palette__item");
    if (!item) return;
    e.preventDefault();
    runCommand(item.closest(".command-palette"), item);
  });
  document.addEventListener("mousemove", (e) => {
    const item = e.target.closest?.(".command-palette__item");
    if (item && !item.hasAttribute("data-active")) activateCommand(item.closest(".command-palette"), item);
  });
  document.addEventListener("click", (e) => {
    const dialog = e.target.closest?.(".command-palette");
    if (!dialog) return;
    const line = e.target.closest(".command-palette__line");
    const delta = e.target.closest("[data-delta]");
    if (line && delta) setCount(dialog, line.paletteItem, countOf(line.paletteItem) + Number(delta.dataset.delta));
    else if (line && e.target.closest("[data-options]")) {
      const item = line.paletteItem;
      item.dispatchEvent(new CustomEvent("options", { bubbles: true, detail: { value: commandValue(item), quantity: countOf(item), item } }));
    } else if (e.target.closest(".command-palette__intent")) confirmPalette(dialog, e.target.closest(".command-palette__intent"));
  });
  // close does not bubble: caught on the way down.
  document.addEventListener("close", (e) => {
    if (!e.target.matches?.(".command-palette")) return;
    paletteParts(e.target).field.value = "";
    filterCommands(e.target);
  }, true);

  // Attachment: built from data-name and data-size. The page sets data-state (uploading, error) and data-progress (0 to
  // 100); data-error says what failed. Remove fires "remove" on the attachment, folds it away and moves the focus to the
  // next file; retry fires "retry". An error is announced once.
  const FILE_ICONS = { pdf: "file-pdf", doc: "file-doc", docx: "file-doc", xls: "file-xls", xlsx: "file-xls", csv: "file-csv", ppt: "file-ppt", pptx: "file-ppt", zip: "file-zip",
    txt: "file-text", md: "file-text", png: "file-image", jpg: "file-image", jpeg: "file-image", gif: "file-image", webp: "file-image", svg: "file-image", heic: "file-image",
    mp3: "file-audio", wav: "file-audio", m4a: "file-audio", mp4: "file-video", mov: "file-video", webm: "file-video", js: "file-code", ts: "file-code", json: "file-code", html: "file-code", css: "file-code" };
  const fileSize = (bytes, lang) => {
    const units = ["B", "KB", "MB", "GB"];
    let n = +bytes;
    let i = 0;
    for (; n >= 1024 && i < units.length - 1; i++) n /= 1024;
    return `${n.toLocaleString(lang, { maximumFractionDigits: i && n < 10 ? 1 : 0 })} ${units[i]}`;
  };
  const syncAttachment = (el) => {
    const bar = el.querySelector(".attachment__bar");
    if (!bar) return;
    const pct = Math.round(Math.min(100, Math.max(0, +el.dataset.progress || 0)));
    el.style.setProperty("--progress", pct);
    el.querySelector(".attachment__percent").textContent = `${pct}%`;
    bar.setAttribute("aria-valuenow", pct);
    const error = el.dataset.error || "Upload failed";
    el.querySelector(".attachment__error").textContent = error;
    if (el.dataset.state === "error" && el.shownState !== "error") announce(`${el.dataset.name}: ${error}`);
    el.shownState = el.dataset.state;
  };
  const buildAttachment = (el) => {
    const name = el.dataset.name || "";
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 ? name.slice(dot) : "";
    el.innerHTML = `<span class="attachment__icon" aria-hidden="true"><i class="icon" data-icon="${FILE_ICONS[ext.slice(1).toLowerCase()] || "file"}"></i><i class="icon" data-icon="warning-circle"></i></span>`
      + '<span class="attachment__body"><span class="attachment__name"><span class="attachment__base"></span><span class="attachment__ext"></span></span>'
      + '<span class="attachment__meta"><span class="attachment__size"></span><span class="attachment__percent"></span><span class="attachment__error"></span></span></span>'
      + '<button type="button" class="btn" data-variant="icon" data-attachment="retry"><i class="icon" data-icon="arrow-clockwise"></i></button>'
      + '<button type="button" class="btn" data-variant="icon" data-attachment="remove"><i class="icon" data-icon="x"></i></button>'
      + '<span class="attachment__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span class="attachment__fill"></span></span>';
    el.querySelector(".attachment__name").dataset.tip = name;
    el.querySelector(".attachment__base").textContent = name.slice(0, name.length - ext.length);
    el.querySelector(".attachment__ext").textContent = ext;
    if (el.dataset.size) el.querySelector(".attachment__size").textContent = fileSize(el.dataset.size, el.closest("[lang]")?.lang || undefined);
    el.querySelector('[data-attachment="retry"]').setAttribute("aria-label", `Retry ${name}`);
    el.querySelector('[data-attachment="remove"]').setAttribute("aria-label", `Remove ${name}`);
    el.querySelector(".attachment__bar").setAttribute("aria-label", `Uploading ${name}`);
    el.shownState = el.dataset.state;
    syncAttachment(el);
    window.renderIcons(el);
  };
  const removeAttachment = (el) => {
    if (el.hasAttribute("data-leaving")) return;
    const files = [...el.parentElement.querySelectorAll(":scope > .attachment:not([data-leaving])")];
    const i = files.indexOf(el);
    // Focus moves on to the next file, else the previous one, else the field of the composer it belongs to.
    const next = (files[i + 1] || files[i - 1])?.querySelector('[data-attachment="remove"]') || el.closest(".composer")?.querySelector(".composer__input");
    if (el.contains(document.activeElement)) next?.focus();
    el.setAttribute("data-leaving", "");
    el.dispatchEvent(new CustomEvent("remove", { bubbles: true, detail: { name: el.dataset.name } }));
    el.addEventListener("animationend", (a) => a.animationName === "attachment-out" && el.remove());
    if (!parseFloat(getComputedStyle(el).animationDuration)) el.remove();
  };
  document.addEventListener("click", (e) => {
    const button = e.target.closest?.(".attachment > [data-attachment]");
    if (!button) return;
    const el = button.closest(".attachment");
    if (button.dataset.attachment === "remove") return removeAttachment(el);
    // Retry hides once the upload restarts: the focus waits on the remove button.
    if (button === document.activeElement) el.querySelector('[data-attachment="remove"]').focus();
    el.dispatchEvent(new CustomEvent("retry", { bubbles: true, detail: { name: el.dataset.name } }));
  });

  // Slider: the native range input stays (pointer, keys, screen reader) and gets a drawn track, fill and thumb. Its value
  // sets --value; the readout and aria-valuetext follow, with data-unit after the number. data-scale writes the min and max
  // under it; data-marks puts a dot on each step (up to 20). Script that sets the value dispatches "input" on the field.
  let sliderIds = 0;
  const syncSlider = (input) => {
    const root = input.closest(".slider");
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const pct = max > min ? ((Number(input.value) - min) / (max - min)) * 100 : 0;
    root.style.setProperty("--value", pct);
    const text = `${Number(input.value).toLocaleString(root.closest("[lang]")?.lang || undefined)}${root.dataset.unit || ""}`;
    const readout = root.querySelector(".slider__value");
    if (readout) readout.textContent = text;
    root.dataset.unit ? input.setAttribute("aria-valuetext", text) : input.removeAttribute("aria-valuetext");
    root.querySelectorAll(".slider__mark").forEach((m) => m.toggleAttribute("data-on", Number(m.style.getPropertyValue("--at")) <= pct));
  };
  const buildSlider = (root) => {
    const input = root.querySelector('input[type="range"]');
    if (!input) return;
    const control = Object.assign(document.createElement("span"), { className: "slider__control" });
    input.replaceWith(control);
    control.innerHTML = '<span class="slider__track" aria-hidden="true"><span class="slider__fill"></span></span><span class="slider__thumb" aria-hidden="true"></span>';
    control.prepend(input);
    input.id ||= `slider-${++sliderIds}`;
    const label = root.querySelector(".slider__label");
    if (label?.matches("label")) label.htmlFor = input.id;
    const readout = root.querySelector(".slider__value");
    if (readout) { readout.htmlFor = input.id; readout.setAttribute("aria-hidden", "true"); }
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const steps = (max - min) / Number(input.step || 1);
    if (root.hasAttribute("data-marks") && steps <= 20) {
      const track = control.querySelector(".slider__track");
      for (let i = 0; i <= steps; i++) {
        const mark = Object.assign(document.createElement("span"), { className: "slider__mark" });
        mark.style.setProperty("--at", (i / steps) * 100);
        track.append(mark);
      }
    }
    if (root.hasAttribute("data-scale")) {
      const unit = root.dataset.unit || "";
      root.insertAdjacentHTML("beforeend", '<span class="slider__scale" aria-hidden="true"><span></span><span></span></span>');
      const [low, high] = root.querySelectorAll(".slider__scale > span");
      low.textContent = `${min}${unit}`;
      high.textContent = `${max}${unit}`;
    }
    syncSlider(input);
  };
  document.addEventListener("input", (e) => { if (e.target.matches?.('.slider input[type="range"]')) syncSlider(e.target); });

  // Tag input: chips and a text field in one box. Enter or a comma adds what is typed; a tag already there (any case) is
  // refused: it shakes and the text stays. Backspace in the empty field removes the last tag, × removes one. Fires "change"
  // on the root (event.detail.value, the tag values). Inside a .combobox, picking a suggestion adds it as a tag.
  const tagsOf = (root) => [...root.querySelectorAll(":scope > .tag-input__tag")];
  const tagRemover = (label) => {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "tag-input__remove", innerHTML: '<i class="icon" data-icon="x"></i>' });
    b.setAttribute("aria-label", `Remove ${label}`);
    return b;
  };
  const tagsChanged = (root) => {
    const box = root.parentElement;
    if (box?.matches(".combobox") && box.querySelector(".combobox__list")?.id) filterCombo(box);
    root.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { value: tagsOf(root).map((t) => t.dataset.value) } }));
  };
  const addTag = (root, label, value = label) => {
    label = label.trim();
    value = String(value).trim();
    if (!label) return false;
    const twin = tagsOf(root).find((t) => t.dataset.value.toLowerCase() === value.toLowerCase());
    if (twin) {
      twin.removeAttribute("data-invalid");
      void twin.offsetWidth; // replays the shake when the same tag is refused twice in a row
      twin.setAttribute("data-invalid", "");
      announce(`${twin.textContent} is already added`);
      return false;
    }
    const tag = Object.assign(document.createElement("span"), { className: "chip tag-input__tag", textContent: label });
    tag.dataset.value = value;
    tag.append(tagRemover(label));
    root.querySelector(":scope > input").before(tag);
    window.renderIcons(tag);
    announce(`${label} added`);
    tagsChanged(root);
    return true;
  };
  const removeTag = (tag) => {
    const root = tag.parentElement;
    tag.remove();
    announce(`${tag.textContent} removed`);
    tagsChanged(root);
  };
  const buildTagInput = (root) => {
    const field = root.querySelector(":scope > input");
    if (!field || root.tagInput) return;
    root.tagInput = true;
    for (const chip of root.querySelectorAll(":scope > .chip")) {
      chip.classList.add("tag-input__tag");
      chip.dataset.value ??= chip.textContent.trim();
      chip.append(tagRemover(chip.textContent.trim()));
    }
    field.autocomplete = "off";
    // The root fires the tag list as "change": the field's own change stays inside.
    field.addEventListener("change", (e) => e.stopPropagation());
    if (root.parentElement?.matches(".combobox") && root.parentElement.querySelector(".combobox__list")?.id) filterCombo(root.parentElement);
    window.renderIcons(root);
  };
  document.addEventListener("input", (e) => {
    const field = e.target.matches?.(".tag-input > input") && e.target;
    if (!field) return;
    const root = field.closest(".tag-input");
    for (const t of tagsOf(root)) t.removeAttribute("data-invalid");
    if (!field.value.includes(",")) return;
    // Typed or pasted commas: every complete part becomes a tag, the rest stays in the field.
    const parts = field.value.split(",");
    field.value = parts.pop().trimStart();
    for (const part of parts) addTag(root, part);
    if (root.parentElement?.matches(".combobox")) filterCombo(root.parentElement);
  });
  document.addEventListener("keydown", (e) => {
    const field = e.target.matches?.(".tag-input > input") && e.target;
    // A suggestion picked by the combobox already handled this Enter.
    if (!field || e.defaultPrevented || e.isComposing) return;
    const root = field.closest(".tag-input");
    if (e.key === "Enter" && field.value.trim()) {
      e.preventDefault();
      if (addTag(root, field.value)) field.value = "";
      if (root.parentElement?.matches(".combobox")) filterCombo(root.parentElement);
    } else if (e.key === "Backspace" && !field.value && tagsOf(root).length) {
      e.preventDefault();
      removeTag(tagsOf(root).at(-1));
    }
  });
  document.addEventListener("click", (e) => {
    const root = e.target.closest?.(".tag-input");
    if (!root) return;
    const remove = e.target.closest(".tag-input__remove");
    if (remove) removeTag(remove.parentElement);
    // The whole box is the field: a click on a tag, the padding or a × puts the caret back in it.
    if (!e.target.closest("input")) root.querySelector(":scope > input").focus();
  });
  document.addEventListener("select", (e) => {
    const root = e.detail?.option && e.target.matches?.(".combobox") && e.target.querySelector(":scope > .tag-input");
    if (!root) return;
    const field = root.querySelector(":scope > input");
    addTag(root, e.detail.option.querySelector(".combobox__title")?.textContent || field.value, e.detail.value);
    field.value = "";
  });

  // Markup present at load and markup rendered later get the same behaviours.
  const each = (node, selector, fn) => {
    if (node.nodeType !== 1) return;
    if (node.matches(selector)) fn(node);
    node.querySelectorAll(selector).forEach(fn);
  };
  const enhance = (node) => {
    each(node, ".btn:is([data-busy], [data-done], [data-error], [data-copy]):not([data-state])", buildButton);
    each(node, ".segmented", placeIndicator);
    each(node, ".value", (el) => values.has(el) || values.set(el, el.textContent));
    each(node, ".tabs", initTabs);
    each(node, "[data-menu], [data-context-menu]", initMenuTrigger);
    each(node, ".pagination[data-pages]", renderPagination);
    each(node, ".table[data-sortable]", initTable);
    each(node, ".toc[data-spy]", (nav) => { spies.add(nav); spy(nav); });
    each(node, ".sticky-header", (header) => { stickies.add(header); stick(header); });
    each(node, ".reading-progress[data-for]", (bar) => { readings.add(bar); follow(bar); });
    each(node, ".btn[data-hold]:not([data-state])", buildHold);
    each(node, ".checkbox__box", buildCheckbox);
    each(node, ".field", buildField);
    each(node, ".textarea[data-max]:not(:has(.textarea__count))", buildTextarea);
    each(node, ".typing__dots", startDance);
    each(node, ".composer", syncComposer);
    each(node, ".tool-call", buildToolCall);
    each(node, ".stepper", buildStepper);
    each(node, ".combobox", buildCombobox);
    each(node, ".steps", buildSteps);
    each(node, ".divider", buildDivider);
    each(node, ".carousel[id]", buildCarousel);
    each(node, ".rich-editor:not(:has(.rich-editor__box))", buildRichEditor);
    each(node, ".date-picker:not(:has(.date-picker__field))", buildDatePicker);
    each(node, ".command-palette", buildCommandPalette);
    each(node, ".attachment:not(:has(.attachment__body))", buildAttachment);
    each(node, ".slider:not(:has(.slider__control))", buildSlider);
    each(node, ".tag-input", buildTagInput);
  };
  enhance(document.body);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") {
        if (r.target.parentElement?.matches(".segmented, .tabs")) placeIndicator(r.target.parentElement);
        if (r.target.matches(".pagination")) renderPagination(r.target);
        if (r.target.matches(".field")) syncField(r.target);
        if (r.target.matches(".tool-call")) syncToolCall(r.target);
        if (r.target.matches(".attachment")) syncAttachment(r.target);
        if (r.attributeName === "data-count" && r.target.closest(".command-palette")) syncCart(r.target.closest(".command-palette"));
        continue;
      }
      const value = (r.target.nodeType === 1 ? r.target : r.target.parentElement)?.closest(".value");
      if (value) watchValue(value);
      if (r.type === "childList") r.addedNodes.forEach(enhance);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-pressed", "aria-selected", "data-page", "data-invalid", "data-state", "data-progress", "data-error", "data-count"] });
})();
