// Topic page: renders a topic from the topic.json next to the page. One template for every topic.
(async () => {
  // Every path starts from this script's folder (the kit) and its parent (the site root): a topic can sit at any depth.
  const KIT = new URL(".", document.currentScript.src);
  const ROOT = new URL("..", KIT);
  // Minimaly icons and tooltips (ds.js) load in parallel with the topic: renderIcons() runs after each render.
  const dsReady = new Promise((resolve) => document.head.appendChild(Object.assign(document.createElement("script"), { src: new URL("minimaly/ds.js", KIT), onload: resolve })));
  const get = (url) => fetch(url, { cache: "no-store" }).then((r) => r.json());
  const load = (src) => new Promise((resolve) => document.head.appendChild(Object.assign(document.createElement("script"), { src, onload: resolve })));
  // journal.md next to topic.json is optional: the iteration log of the topic, shown as the Journal section.
  const [topic, site, journal] = await Promise.all([
    get("topic.json"),
    get(new URL("protopass.json", ROOT)),
    fetch("journal.md", { cache: "no-store" }).then((r) => (r.ok ? r.text() : "")),
    load(new URL("markdown.js", KIT)),
  ]);
  topic.screens ??= [];
  // A state is { name, note }: the name drives ?state=, the note is shown where the state is looked at
  // (under the screen in Prototype, in the tooltip of its button).
  const NOTES = new Map(topic.screens.flatMap((s) => (s.states || []).map((st) => [`${s.id}|${st.name}`, st.note || ""])));
  for (const s of topic.screens) if (s.states) s.states = s.states.map((st) => st.name);
  const noteOf = (s, state) => NOTES.get(`${s.id}|${state}`) || "";
  // Components used by the topic, linked to their playground page in the topic's design system.
  // Minimaly ships with the kit; other design systems are declared in protopass.json → designSystems.
  const dsUrl = (name) => (name === "Minimaly" ? new URL("minimaly/", KIT) : new URL(site.designSystems[name].replace(/\/?$/, "/"), ROOT));
  topic.ds ||= "Minimaly";
  const catalog = topic.components?.length ? await get(new URL("components.json", dsUrl(topic.ds))) : [];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const STATUS = { draft: "Draft", review: "In review", ready: "Ready for development", shipped: "Shipped" };
  const TONE = { draft: "warning", review: "accent", ready: "success" };
  const badge = (status) => `<span class="badge"${TONE[status] ? ` data-variant="${TONE[status]}"` : ""}>${STATUS[status] || esc(status)}</span>`;
  await dsReady;
  // Copy to Figma is a designer tool: only offered when the page is served locally.
  const LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

  const icon = (name, cls = "") => `<i class="icon${cls ? ` ${cls}` : ""}" data-icon="${name}"></i>`;
  const arrow = icon("arrow-right", "arrow");
  const stateId = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const screenUrl = (s, state) => `${s.file}${state ? `?state=${stateId(state)}` : ""}`;
  const date = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const vp = topic.viewport || { width: 390, height: 780 };
  // Phone screens stay small; wider screens get a wider thumbnail so they can be read.
  const SHOT_WIDTH = vp.width < 600 ? 272 : vp.width < 1100 ? 420 : 640;
  // Tablet: iPad 6th generation in landscape.
  const DEVICES = { mobile: { width: 390, height: 844 }, tablet: { width: 1024, height: 768 }, desktop: { width: 1440, height: 900 } };
  const NATIVE = vp.width < 600 ? "mobile" : vp.width < 1100 ? "tablet" : "desktop";
  DEVICES[NATIVE] = vp;
  const DEVICE_ICON = { mobile: "device-mobile", tablet: "device-tablet", desktop: "desktop" };
  // topic.json → devices: the sizes this mockup is designed for. Missing = all of them. Always shown from the smallest to the largest.
  const ENABLED = Object.keys(DEVICES).filter((d) => !topic.devices?.length || topic.devices.includes(d));
  const DEFAULT_DEVICE = ENABLED.includes(NATIVE) ? NATIVE : ENABLED[0];
  const scale = SHOT_WIDTH / vp.width;
  // The published address, whatever copy copies the post (a local one too): protopass.json → url + the topic path.
  const HERE = location.href.split(/[?#]/)[0];
  const PAGE = site.url ? `${site.url.replace(/\/?$/, "/")}${HERE.slice(ROOT.href.length)}` : HERE;

  // Brands: looks of the same screens, topic.json → brands. The first one is in screens.css, another one is added after it,
  // so it wins. The link waits for it: a screen must not fade in with the wrong look.
  const BRANDS = topic.brands || [];
  const linkBrand = new URLSearchParams(location.search).get("brand");
  let shownBrand = BRANDS.find((b) => stateId(b) === linkBrand) || BRANDS[0];
  const brandScreen = (frame) => {
    frame.brandReady = undefined;
    try {
      const doc = frame.contentDocument;
      doc.getElementById("protopass-brand")?.remove();
      if (shownBrand === BRANDS[0]) return;
      const link = Object.assign(doc.createElement("link"), { id: "protopass-brand", rel: "stylesheet", href: new URL(`brands/${stateId(shownBrand)}.css`, HERE) });
      frame.brandReady = new Promise((resolve) => { link.onload = link.onerror = resolve; });
      doc.head.append(link);
    } catch {}
  };

  // Theme: the page and every screen it shows (thumbnails, canvas, prototype) switch together. Kept on this device.
  // A link carries its own (?theme=): it opens as it was seen, without changing what this device remembers.
  let theme = "light";
  try { theme = localStorage.getItem("protopass-theme") || theme; } catch {}
  const linkTheme = new URLSearchParams(location.search).get("theme");
  if (linkTheme === "light" || linkTheme === "dark") theme = linkTheme;
  const themeScreen = (frame) => { try { frame.contentDocument.documentElement.dataset.theme = theme; } catch {} };
  const applyTheme = () => {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll("iframe").forEach(themeScreen);
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.innerHTML = icon(theme === "dark" ? "sun" : "moon");
    });
    window.renderIcons?.();
  };
  // A screen loaded later (state change, next prototype step) takes the theme too: load does not bubble, capture does.
  document.addEventListener("load", (e) => { if (e.target.tagName === "IFRAME") { themeScreen(e.target); brandScreen(e.target); } }, true);
  const themeToggle = () => `<button class="btn" data-variant="icon" data-theme-toggle aria-label="Dark theme" data-tip="Switch the page and the screens between light and dark">${icon(theme === "dark" ? "sun" : "moon")}</button>`;

  const shot = (s) => {
    const state = s.states?.[0];
    return `
      <div class="shot" data-screen="${s.id}">
        <div class="shot__head">${esc(s.label)}${LOCAL ? `<button class="btn" data-variant="ghost" data-figma="${s.id}" data-tip="Copy this screen, in its current state, as a Figma frame. Paste in Figma with Ctrl+V">${icon("figma-logo")}Copy to Figma</button>` : ""}</div>
        <div class="shot__frame" style="width:${SHOT_WIDTH}px;height:${Math.round(vp.height * scale)}px">
          <iframe src="${screenUrl(s, state)}" title="${esc(s.label)}" width="${vp.width}" height="${vp.height}" style="transform:scale(${scale})" tabindex="-1"></iframe>
          <a href="${screenUrl(s, state)}" target="_blank" aria-label="Open ${esc(s.label)}"></a>
        </div>
      </div>`;
  };

  // Flow steps name a screen, optionally in a state: "add-loan" or "add-loan:error".
  const resolveStep = (step) => {
    const [id, stateKey] = step.split(":");
    const s = topic.screens.find((x) => x.id === id);
    return { s, state: stateKey ? s?.states?.find((st) => stateId(st) === stateKey) : s?.states?.[0] };
  };
  // A topic with a single screen names its steps by state only: the screen name would repeat on every step.
  const stepLabel = (step) => {
    const { s, state } = resolveStep(step);
    if (!s) return step;
    if (topic.screens.length === 1) return state || s.label;
    return state && state !== s.states?.[0] ? `${s.label} · ${state}` : s.label;
  };


  // Trail: home (the brand), the group whose folder holds the topic, the application (a filtered list), then this topic.
  const group = site.groups.find((g) => HERE.startsWith(new URL(`${g.path}/`, ROOT).href));
  const breadcrumb = () => {
    const list = new URL(`${group.path}/`, ROOT);
    const trail = [[group.title, list], ...(topic.app ? [[topic.app, `${list}?q=${encodeURIComponent(topic.app)}`]] : [])];
    const sep = '<span class="breadcrumb__sep">/</span>';
    return `<nav class="breadcrumb" aria-label="Breadcrumb">${trail.map(([label, href]) => `${sep}<a href="${href}">${esc(label)}</a>`).join("")}${sep}<span aria-current="page">${esc(topic.title)}</span></nav>`;
  };

  document.head.append(Object.assign(document.createElement("link"), { rel: "icon", href: new URL("favicon.svg", KIT) }));
  const brand = () => `<a class="brand" href="${ROOT}" data-tip="Back to home"><i class="brand__mark"></i><b>Protopass</b></a>`;

  const story = (text) => esc(text).replace(/^(As an? [^,]+),/, "<b>$1</b>,");
  const flowCard = (f, i) => `
        <article class="flow">
          <header class="flow__head">
            <h3 class="flow__name">${esc(f.name)}</h3>
            <span class="flow__tools">${LOCAL ? `<button class="btn" data-variant="ghost" data-figma-flow="${i}" data-tip="Copy every step of this flow as Figma frames, in a section. Paste in Figma with Ctrl+V">${icon("figma-logo")}Copy to Figma</button>` : ""}<button class="btn" data-open="canvas" data-flow="${i}" data-tip="Open this flow on the canvas: its steps side by side">${icon("frame-corners")}Canvas</button><button class="btn" data-open="prototype" data-flow="${i}" data-tip="Play this flow from its first step">${icon("play")}Play</button></span>
          </header>
          ${f.statement ? `<p class="flow__statement">${story(f.statement)}</p>` : ""}
          <ol class="flow__steps">${f.steps.map((st, j) => `<li><button class="flow__step" data-open="prototype" data-flow="${i}" data-step="${j}" data-tip="Play this flow from this step"><span class="flow__num">${j + 1}</span>${esc(stepLabel(st))}</button></li>`).join("")}</ol>
        </article>`;

  // A UX deliverable: a working document of the topic (a ranking sheet, a study), not a screen of the product.
  // A Markdown deliverable (a story, a study) opens in the reader page, where screen links play in the prototype.
  const deliverableUrl = (file) => (/\.md$/i.test(file) ? `${KIT}doc.html?topic=${encodeURIComponent(HERE.slice(ROOT.href.length))}&file=${encodeURIComponent(file)}` : file);
  const deliverableCard = (d) => `
        <article class="flow">
          <header class="flow__head">
            <h3 class="flow__name">${esc(d.name)}</h3>
            <span class="flow__tools"><a class="btn" href="${esc(deliverableUrl(d.file))}" target="_blank" data-tip="Open this deliverable in a new tab">${icon("arrow-square-out")}Open</a></span>
          </header>
          ${d.statement ? `<p class="flow__statement">${esc(d.statement)}</p>` : ""}
        </article>`;

  const first = topic.screens[0];
  document.title = `${topic.title} · Protopass`;
  // Motion tokens for the animations driven from JS; they fall to 0 under reduced motion.
  const motion = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ms = (name) => parseFloat(motion(name)) || 0;
  // Screens fade in once loaded (.is-loaded in viewer.css). A load event does not bubble: listen in capture.
  document.addEventListener("load", (e) => {
    const frame = e.target;
    if (frame.tagName === "IFRAME") Promise.resolve(frame.brandReady).then(() => frame.classList.add("is-loaded"));
  }, true);
  // Cards entering together come in one after the other.
  const stagger = (els) => els.forEach((el, i) => { el.style.animationDelay = `calc(var(--duration-stagger) * ${Math.min(i, 8)})`; });

  document.body.innerHTML = `
    <header class="topbar">
      <span class="topbar__start">${brand()}${breadcrumb()}</span>
      <span class="topbar__end"><span class="muted">${topic.pi ? `${esc(topic.pi)} · ` : ""}${topic.updated ? `${icon("clock")}Updated ${date(topic.updated)}` : ""}</span>${themeToggle()}<a class="btn" data-variant="ghost" href="${KIT}playground/" data-tip="Browse the components of the design systems: variants, states and usage">${icon("puzzle-piece")}Components</a></span>
    </header>
    <main class="page">
      <h1>${esc(topic.title)}${badge(topic.status)}</h1>
      <p class="intent">${esc(topic.intent)}</p>
      <div class="topic-tags">${[[topic.app, "app-window"], ...(topic.teams || []).map((t) => [t, "users", true]), [topic.pi, "calendar-blank", true]].filter(([t]) => t).map(([t, name, round]) => `<span class="chip"${round ? ' data-variant="round"' : ""}>${icon(name)}${esc(t)}</span>`).join("")}<span class="muted">${icon("clock")}${esc(topic.updated)}</span></div>
      <div class="actions">
        ${topic.prototype ? `<a class="btn" data-variant="primary" href="${esc(topic.prototype)}" target="_blank" data-tip="Open the standalone prototype in a new tab">${icon("app-window")}Open app</a>` : ""}
        ${site.copyPost ? `<button class="btn" data-copy-post data-tip="Copy the announcement for the team chat: teams, title, story, owners, prototype and Figma links">${icon("copy")}Copy post</button>` : ""}
        ${topic.thread ? `<a class="btn" href="${esc(topic.thread)}" target="_blank" data-tip="Open the discussion thread of this prototype">${icon("chat-circle-text")}Discuss</a>` : ""}
      </div>

      ${first ? `<section>
        <div class="section-head"><h2>${icon("devices")}Experience</h2><span class="section-head__tools">${LOCAL ? `<a class="btn" href="${KIT}skills/build-mockup/lint.html?topic=${encodeURIComponent(HERE.slice(ROOT.href.length))}" data-tip="Measure contrast, overflow, overlaps and tap targets on every screen and state">${icon("check-circle")}Check render</a>` : ""}${topic.figma ? `<a class="btn" href="${esc(topic.figma)}" target="_blank" data-tip="Open the Figma file of this topic in a new tab">${icon("figma-logo")}Open in Figma</a>` : ""}<button class="btn" data-open="canvas" data-flow="all" data-tip="Every flow side by side, with the flow arrows. Pan and zoom">${icon("frame-corners")}Open canvas</button><button class="btn" data-variant="primary" data-open="prototype" data-flow="${topic.flows?.length ? 0 : "all"}" data-tip="Play the screens one at a time, at their real size">${icon("play")}Play Prototype</button></span></div>
        <div class="experience" id="experience">${topic.screens.map(shot).join(arrow)}</div>
      </section>` : ""}
      ${topic.flows?.length ? `<section><div class="section-head"><h2>${icon("flow-arrow")}${topic.flows.length > 1 ? "Flows" : "Flow"}</h2><span class="section-head__tools">${LOCAL && topic.flows.length > 1 ? `<button class="btn" data-variant="ghost" data-figma-all data-tip="Copy every flow as Figma frames, one section per flow, stacked. Paste in Figma with Ctrl+V">${icon("figma-logo")}Copy all to Figma</button>` : ""}</span></div><div class="flows">${topic.flows.map(flowCard).join("")}</div></section>` : ""}
      ${topic.deliverables?.length ? `<section><div class="section-head"><h2>${icon("files")}UX Deliverables</h2></div><div class="flows">${topic.deliverables.map(deliverableCard).join("")}</div></section>` : ""}
      ${catalog.length ? `<section><h2>${icon("puzzle-piece")}${esc(topic.ds)} components</h2><div class="chips">${topic.components.map((id) => {
        const c = catalog.find((x) => x.id === id);
        return `<a class="btn" href="${KIT}playground/?ds=${encodeURIComponent(topic.ds)}#${id}" target="_blank" data-tip="Open the component page: variants, states and usage">${esc(c?.name || id)}</a>`;
      }).join("")}</div></section>` : ""}
      ${topic.qa?.length ? `<section><h2>${icon("chats-circle")}Q&amp;A</h2><div class="accordion">${topic.qa.map((x) => `<details class="accordion__item"><summary>${esc(x.q)}${icon("caret-down")}</summary><div class="accordion__body">${esc(x.a)}</div></details>`).join("")}</div></section>` : ""}
      ${topic.questions?.length ? `<section><h2>${icon("question")}Open questions</h2>${topic.questions.map((q) => `<p class="question">${icon("question")}${esc(q)}</p>`).join("")}</section>` : ""}
      ${journal.trim() ? `<section><h2>${icon("notebook")}Journal</h2><div class="md">${renderMarkdown(journal, { link: (href) => { const m = href.match(/^screen:([\w-]+)(?::([\w-]+))?$/); return m ? `?view=prototype&flow=all&at=${encodeURIComponent(`${m[1]}:${m[2] || ""}`)}` : href; } })}</div></section>` : ""}
    </main>
    <div class="toast" id="toast"></div>`;
  renderIcons();
  applyTheme();
  for (const name of ["updates.js", "live.js"]) document.head.append(Object.assign(document.createElement("script"), { src: new URL(name, KIT) }));

  // A screen file that does not answer shows a server error inside its frame: said once, above the page and the viewer.
  Promise.all(topic.screens.map((s) => fetch(s.file, { method: "HEAD", cache: "no-store" }).then((r) => (r.ok ? null : s), () => s))).then((list) => {
    const missing = list.filter(Boolean);
    if (!missing.length) return;
    document.body.insertAdjacentHTML("beforeend", `<div class="banner page-alert" data-variant="critical" role="alert">${icon("warning")}<div class="banner__body"><span class="banner__title">${missing.length} screen${missing.length > 1 ? "s" : ""} did not load</span><span class="banner__text">${missing.map((s) => esc(s.file)).join(", ")}</span></div><button class="btn" data-variant="icon" data-dismiss aria-label="Dismiss">${icon("x")}</button></div>`);
    renderIcons();
  });

  const toast = (text) => {
    const t = document.getElementById("toast");
    t.textContent = text;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1800);
  };

  // Rich text when the clipboard takes it (Google Chat keeps the bold title and the named links), plain text otherwise.
  const copyText = async (text, done, html) => {
    try {
      if (html && navigator.clipboard.write) await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]);
      else await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      toast("Clipboard blocked, click again");
    }
  };

  // Announcement for the team chat: teams and title, story, owners, the prototype and Figma links.
  const post = () => {
    const title = `${topic.teams?.length || topic.app ? `[${(topic.teams?.length ? topic.teams : [topic.app]).join("/")}] - ` : ""}${topic.title}`;
    const owners = topic.owners?.length ? topic.owners.map((o) => `@${o}`).join(" ") : "-";
    const text = [`*${title}*`, `🟢 Story : ${topic.story || "-"}`, `👤 Owners : ${owners}`, `📐 HTML Prototype : ${PAGE}`, `🎨 Figma : ${topic.figma || "-"}`].join("\n");
    const html = [`<b>${esc(title)}</b>`, `🟢 Story : ${esc(topic.story || "-")}`, `👤 Owners : ${esc(owners)}`, `📐 <a href="${esc(PAGE)}">HTML Prototype</a>`, topic.figma ? `🎨 <a href="${esc(topic.figma)}">Figma Link</a>` : "🎨 Figma : -"].join("<br>");
    return { text, html };
  };


  document.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-theme-toggle]")) {
      theme = theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("protopass-theme", theme); } catch {}
      const url = new URL(location.href);
      url.searchParams.set("theme", theme);
      history.replaceState(history.state, "", url);
      applyTheme();
    }
    if (ev.target.closest("[data-copy-post]")) { const { text, html } = post(); copyText(text, "Post copied, paste it in the team's space", html); }

    // A click on a thumbnail opens the canvas on that screen; Ctrl/middle click still opens a tab.
    const shotLink = ev.target.closest(".shot__frame a");
    if (shotLink && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) {
      ev.preventDefault();
      const id = shotLink.closest("[data-screen]").dataset.screen;
      openViewer("canvas", "all", `${id}:${stateId(topic.screens.find((x) => x.id === id).states?.[0] || "")}`);
    }
    const openBtn = ev.target.closest("[data-open]");
    if (openBtn) {
      const step = openBtn.dataset.step;
      if (step !== undefined) proto.start = Number(step);
      const at = step !== undefined ? (() => { const r = resolveStep(topic.flows[openBtn.dataset.flow].steps[step]); return keyOf(r.s, r.state); })() : undefined;
      openViewer(openBtn.dataset.open, openBtn.dataset.flow, at);
    }

    if (ev.target.closest("[data-figma-current]")) {
      const frame = document.getElementById("proto-frame");
      if (frame) copyScreenToFigma(frame.contentDocument, viewer.at ? stepName(viewer.at) : topic.title, Number(frame.width), Number(frame.height));
    }
    const figmaBtn = ev.target.closest("[data-figma]");
    if (figmaBtn) copyToFigma(figmaBtn.dataset.figma);
    const flowBtn = ev.target.closest("[data-figma-flow]");
    if (flowBtn) copyFlowToFigma(topic.flows[flowBtn.dataset.figmaFlow]);
    if (ev.target.closest("[data-figma-all]")) copyFlowsToFigma(topic.flows);
  });

  // ---- Canvas view: ?view=canvas&flow=<index|all> ------------------------------------------------------
  // The screens of one flow (or every screen and state) at full size on a pannable, zoomable board.
  // Cards are previews: a double-click focuses one, playing the screens is the Prototype mode.
  let camera = null;
  const loadCamera = () => window.Canvas || new Promise((resolve) => document.head.appendChild(Object.assign(document.createElement("script"), { src: new URL("canvas.js", KIT), onload: resolve })));

  const card = (s, state, label) => `
    <figure class="canvas-card" data-screen="${s.id}" data-card="${s.id}:${state ? stateId(state) : ""}">
      <figcaption>${esc(label)}</figcaption>
      <div class="canvas-card__frame" style="width:${size().width}px;height:${size().height}px">
        <iframe src="${screenUrl(s, state)}" title="${esc(label)}" width="${size().width}" height="${size().height}" tabindex="-1"></iframe>
      </div>
    </figure>`;
  const bigArrow = icon("arrow-right", "canvas__arrow");
  // One flow: one card per step, arrows between them.
  const flowRow = (f) => `<div class="canvas__row canvas__row--flow">${topic.flows[f].steps.map((step, i) => {
    const { s, state } = resolveStep(step);
    return card(s, state, `${i + 1} · ${stepLabel(step)}`);
  }).join(bigArrow)}</div>`;
  // A flow in its own section, its name above with Play, and Focus when every flow is shown.
  const flowSection = (i, focus) => `<section class="canvas__flow"><span class="canvas__flow-head"><span class="canvas__flow-name">${esc(topic.flows[i].name || `Flow ${Number(i) + 1}`)}</span>${focus ? `<button class="btn" data-variant="icon" data-flow-focus="${i}" aria-label="Focus" data-tip="Show only this flow">${icon("target")}</button>` : ""}<button class="btn" data-variant="icon" data-flow-play="${i}" aria-label="Play" data-tip="Play this flow in the prototype">${icon("play")}</button></span>${flowRow(i)}</section>`;
  // Every state of every screen: one row per screen, one card per state. Steps of a flow never show a state no flow uses.
  const wall = () => topic.screens.map((s) => `<div class="canvas__row">${(s.states?.length ? s.states : [null]).map((st) => card(s, st, st ? `${s.label} · ${st}` : s.label)).join("")}</div>`).join("");
  const board = (sel) => {
    if (sel === "states" || !topic.flows?.length) return wall();
    if (sel !== "all") return flowSection(sel, false);
    // All: every flow in its own section, one under the other.
    return topic.flows.map((_, i) => flowSection(i, true)).join("");
  };

  // A screen is addressed by "<id>:<state id>" ("home:" when it has no state).
  const keyOf = (s, state) => `${s.id}:${state ? stateId(state) : ""}`;
  const fromKey = (key) => {
    const [id, stateKey] = (key || "").split(":");
    const s = topic.screens.find((x) => x.id === id);
    return s ? { s, state: s.states?.find((st) => stateId(st) === stateKey) || s.states?.[0] } : null;
  };
  // The first screen of a view: first step of the flow (the first flow for All), or first screen.
  const firstKey = (sel) => {
    const flow = topic.flows?.[sel === "all" ? 0 : sel];
    if (flow) {
      const { s, state } = resolveStep(flow.steps[0]);
      return keyOf(s, state);
    }
    return keyOf(topic.screens[0], topic.screens[0].states?.[0]);
  };

  // Viewer: one overlay, two modes. Canvas = screens side by side with the flow arrows. Prototype = one screen,
  // playable, at its real size. Switching keeps the current screen. ?view=canvas|prototype&flow=<i|all|states>&at=<key>
  const viewer = { mode: null, sel: null, at: null, device: DEFAULT_DEVICE, full: false };
  // Size of the screens in the viewer; the page thumbnails keep the topic viewport.
  const size = () => DEVICES[viewer.device] || vp;

  const setUrl = (push) => {
    const url = new URL(location.href);
    url.searchParams.set("view", viewer.mode);
    url.searchParams.set("flow", viewer.sel);
    url.searchParams.set("device", viewer.device);
    url.searchParams.set("theme", theme);
    BRANDS.length > 1 ? url.searchParams.set("brand", stateId(shownBrand)) : url.searchParams.delete("brand");
    viewer.full ? url.searchParams.set("full", "1") : url.searchParams.delete("full");
    viewer.at ? url.searchParams.set("at", viewer.at) : url.searchParams.delete("at");
    history[push ? "pushState" : "replaceState"](null, "", url);
  };

  const bar = () => {
    const flow = viewer.sel !== "all" ? topic.flows[viewer.sel] : null;
    const canvas = viewer.mode === "canvas";
    return `
      <div class="canvas__bar">
        <button class="btn" data-variant="icon" data-viewer-close aria-label="Close" data-tip="Close (Esc)">${icon("x")}</button>
        <b>${esc(topic.title)}</b>
        <label class="select" data-tip="Show one flow, all of them, or every state"><span class="select__label">View</span><select id="canvas-view">${(topic.flows || []).map((f, i) => `<option value="${i}"${String(i) === String(viewer.sel) ? " selected" : ""}>${esc(f.name || `Flow ${i + 1}`)}</option>`).join("")}<option value="all"${viewer.sel === "all" ? " selected" : ""}>${topic.flows?.length ? "All flows" : "All screens"}</option>${topic.flows?.length ? `<option value="states"${viewer.sel === "states" ? " selected" : ""}>All states</option>` : ""}</select>${icon("caret-down", "select__icon")}</label>
        ${BRANDS.length > 1 ? `<label class="select" data-tip="Show the screens in another brand"><span class="select__label">Brand</span><select id="canvas-brand">${BRANDS.map((b) => `<option${b === shownBrand ? " selected" : ""}>${esc(b)}</option>`).join("")}</select>${icon("caret-down", "select__icon")}</label>` : ""}
        <span class="segmented" role="group" aria-label="Mode"><button class="btn" data-mode="canvas" aria-pressed="${canvas}" data-tip="Screens side by side with the flow arrows. Pan and zoom">${icon("frame-corners")}Canvas</button><button class="btn" data-mode="prototype" aria-pressed="${!canvas}" data-tip="One playable screen at a time, at its real size">${icon("play")}Prototype</button></span>
        ${canvas ? "" : `<button class="btn" data-variant="ghost" data-restart data-tip="Back to the first step of the flow">${icon("arrow-counter-clockwise")}Restart</button>`}
        ${ENABLED.length > 1 && !(viewer.full && !canvas) ? `<span class="segmented" role="group" aria-label="Device">${ENABLED.map((d) => `<button class="btn" data-variant="icon" data-device="${d}" aria-pressed="${d === viewer.device}" aria-label="${d}" data-tip="${d[0].toUpperCase() + d.slice(1)} · ${DEVICES[d].width} × ${DEVICES[d].height}${d === NATIVE ? " (designed size)" : ""}">${icon(DEVICE_ICON[d])}</button>`).join("")}</span>` : ""}
        <span class="canvas__spacer"></span>
        <button class="btn" data-variant="icon" data-help aria-label="Shortcuts" data-tip="Shortcuts (?)">${icon("question")}</button>
        <button class="btn" data-variant="icon" data-inspect aria-pressed="${inspect.on}" aria-label="Inspect" data-tip="Inspect (V): hover a part of a screen to read its tokens, icon and type. Click to pin it">${icon("cursor")}</button>
        ${themeToggle()}
        ${canvas ? "" : `<button class="btn" data-variant="icon" data-full aria-label="Full screen" data-tip="${viewer.full ? "Back to the device size (F or Esc)" : "Full screen (F): the screen takes the whole window, at its real size"}">${icon(viewer.full ? "arrows-in" : "arrows-out")}</button>`}
        ${LOCAL && canvas && flow ? `<button class="btn" data-variant="ghost" data-figma-flow="${viewer.sel}" data-tip="Copy every step of this flow as Figma frames, in a section, at the selected device size. Paste in Figma with Ctrl+V">${icon("figma-logo")}Copy to Figma</button>` : ""}
        ${LOCAL && !canvas ? `<button class="btn" data-variant="ghost" data-figma-current data-tip="Copy the screen shown, in its state and theme, as a Figma frame. Paste in Figma with Ctrl+V">${icon("figma-logo")}Copy to Figma</button>` : ""}
        ${canvas ? `<span class="canvas__zoom"><button class="btn" data-variant="icon" data-zoom="out" aria-label="Zoom out" data-tip="Zoom out (Ctrl + scroll)">${icon("minus")}</button><span id="canvas-zoom">100%</span><button class="btn" data-variant="icon" data-zoom="in" aria-label="Zoom in" data-tip="Zoom in (Ctrl + scroll)">${icon("plus")}</button><button class="btn" data-zoom="fit" data-tip="Fit every screen in view (O)">Fit</button></span>` : ""}
      </div>`;
  };

  // Canvas mode: the board, the camera, a card selected by click, focused by double-click.
  const mountCanvas = (root) => {
    root.insertAdjacentHTML("beforeend", `
      <div class="canvas__viewport" id="canvas-viewport"><div class="canvas__world" id="canvas-world" style="--frame-h:${size().height}px">${board(viewer.sel)}</div></div>
      <p class="canvas__hint">Double-click to focus screen. O to zoom fit. V to Inspect. ← → to move. ? for help.</p>`);
    // Section names keep their screen size while zooming, up to 12 times their canvas size (the room left above a section).
    // Set on the names only: a variable on the world would restyle every card at each frame.
    const names = [...document.querySelectorAll(".canvas__flow-head")];
    const zoomLabel = document.getElementById("canvas-zoom");
    let shown = "", labelK = 0;
    camera = new Canvas(document.getElementById("canvas-viewport"), document.getElementById("canvas-world"), (zoom) => {
      const pct = `${Math.round(zoom * 100)}%`;
      if (pct !== shown) zoomLabel.textContent = shown = pct;
      const k = Math.min(12, 1 / zoom);
      if (Math.abs(k - labelK) > labelK * 0.005) { labelK = k; for (const n of names) n.style.setProperty("--label-k", k); }
    });
    // The current screen may be a state that is not a card of this board: fall back to a card of the same screen.
    const id = (viewer.at || "").split(":")[0];
    const target = viewer.at && (document.querySelector(`[data-card="${viewer.at}"]`) || document.querySelector(`[data-card^="${id}:"]`));
    stagger([...document.querySelectorAll(".canvas-card")]);
    target?.classList.add("is-selected");
    const place = () => (target ? camera.frame(target) : camera.fit());
    place();
    // Opened while the page had no size (hidden tab): place the camera as soon as the viewport gets one.
    const viewport = document.getElementById("canvas-viewport");
    new ResizeObserver((_, ro) => {
      if (!viewport.clientWidth) return;
      if (camera && !camera.placed) place();
      ro.disconnect();
    }).observe(viewport);
    if (LOCAL && topic.flows?.[viewer.sel]) prepareFlow(topic.flows[viewer.sel]);
  };

  // Prototype mode: one playable screen at its real size, scaled down only to fit, state controls below.
  const mountPrototype = (root) => {
    const { s, state } = fromKey(viewer.at) || fromKey(firstKey(viewer.sel));
    root.insertAdjacentHTML("beforeend", `
      <div class="proto${viewer.full ? " is-full" : ""}" id="proto">
        <div class="proto__head"><p class="proto__label" id="proto-label"></p><p class="proto__note" id="proto-note"></p></div>
        <div class="proto__device" id="proto-device"></div>
        <div class="proto__states" id="proto-states"></div>
      </div>
      <p class="canvas__hint">P to Play. I to Highlight. V to Inspect. F for Full screen. ← → to move. ? for help.</p>`);
    // The path → and ← walk: the flow steps, every flow one after the other for All, or every screen and state
    // for All states and for a topic without flows. The index, not the screen, is the position: a screen can come back later.
    proto.flow = Boolean(topic.flows?.length) && viewer.sel !== "states";
    const stepKeys = (f) => f.steps.map((st) => { const r = resolveStep(st); return keyOf(r.s, r.state); });
    // Groups of steps: one per flow (every flow for All), or one per screen for a topic without flows.
    const groups = !proto.flow
      ? topic.screens.map((x) => (x.states?.length ? x.states : [null]).map((st) => keyOf(x, st)))
      : viewer.sel === "all" ? topic.flows.map(stepKeys) : [stepKeys(topic.flows[viewer.sel])];
    proto.steps = groups.flat();
    proto.groups = groups.map((g, i) => groups.slice(0, i).flat().length);
    proto.step = Number.isInteger(proto.start) ? proto.start : Math.max(0, proto.steps.indexOf(viewer.at));
    proto.start = null;
    const device = document.getElementById("proto-device");
    const fit = () => document.querySelectorAll("#proto-device iframe").forEach(fitFrame);
    const fitFrame = (frame) => {
      const box = document.getElementById("proto");
      if (!box) return;
      // Full screen: the screen gets the whole area, unscaled.
      if (viewer.full) {
        Object.assign(device.style, { width: "", height: "" });
        frame.width = box.clientWidth;
        frame.height = box.clientHeight;
        frame.style.transform = "";
        return;
      }
      const { width, height } = size();
      const k = Math.min(1, (box.clientWidth - 48) / width, (box.clientHeight - 164) / height);
      device.style.width = `${width * k}px`;
      device.style.height = `${height * k}px`;
      frame.width = width;
      frame.height = height;
      frame.style.transform = `scale(${k})`;
    };
    new ResizeObserver(fit).observe(document.getElementById("proto"));
    // Double buffer: the next screen loads in a second frame, invisible, on top of the current one. Once it has
    // painted, it comes in and the old frame goes: no blank frame between two screens. dir 1 (forward: a link, →) slides
    // the new screen in from the right and the old one out to the left, dir -1 the other way, dir 0 crossfades.
    proto.load = (url, dir = 0) => {
      const next = Object.assign(document.createElement("iframe"), { title: "Prototype", src: url });
      next.style.opacity = "0";
      fitFrame(next);
      next.addEventListener("load", () => {
        // Every press in the screen leaves a ripple, drawn in the topic page so it survives the change of screen.
        next.contentDocument.addEventListener("pointerdown", (e) => {
          const r = next.getBoundingClientRect();
          const k = r.width / next.offsetWidth;
          const ripple = Object.assign(document.createElement("span"), { className: "proto__ripple" });
          Object.assign(ripple.style, { left: `${r.left + e.clientX * k}px`, top: `${r.top + e.clientY * k}px` });
          document.body.append(ripple);
          ripple.addEventListener("animationend", () => ripple.remove());
        });
        // Links inside the screen load through the same buffer, instead of navigating the visible frame.
        next.contentDocument.addEventListener("click", (e) => {
          const a = e.target.closest?.("a[href]");
          if (!a || a.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey || new URL(a.href).origin !== location.origin) return;
          e.preventDefault();
          proto.load(a.href, 1);
        });
        Promise.resolve(next.brandReady).then(() => requestAnimationFrame(() => {
          next.style.opacity = "";
          // translate composes with the fit scale held in transform.
          const shift = (k) => `${dir * k}px 0`;
          const timing = { duration: ms(dir ? "--duration-spring" : "--duration-base"), easing: motion(dir ? "--ease-spring" : "--ease-out") };
          const old = [...device.querySelectorAll("iframe")].filter((f) => f !== next);
          if (dir) old.forEach((f) => f.animate([{ translate: "0 0", opacity: 1, filter: "none" }, { translate: shift(-40), opacity: 0, filter: "blur(4px)" }], { duration: ms("--duration-base"), easing: motion("--ease-in"), fill: "forwards" }));
          next.animate([{ opacity: 0, translate: shift(40), filter: dir ? "blur(4px)" : "none" }, { opacity: 1, translate: "0 0", filter: "none" }], timing)
            .finished.then(() => old.forEach((f) => f.remove()));
          device.querySelector("#proto-frame")?.removeAttribute("id");
          next.id = "proto-frame";
          onScreen(next);
        }));
      }, { once: true });
      device.append(next);
    };
    proto.load(screenUrl(s, state));
    // Follow the navigation inside the screen: links go from screen to screen as in the product.
    const onScreen = (frame) => {
      // The frame may be gone already (the viewer closed while it loaded).
      const loc = frame.contentWindow?.location;
      if (!loc) return;
      const file = loc.pathname.split("/").pop();
      const cur = topic.screens.find((x) => x.file.split("/").pop() === file);
      if (!cur) return;
      const st = cur.states?.find((x) => stateId(x) === new URLSearchParams(loc.search).get("state")) || cur.states?.[0];
      viewer.at = keyOf(cur, st);
      setUrl(false);
      // A click inside the screen moves the position to that screen, the next occurrence first.
      if (proto.steps[proto.step] !== viewer.at) {
        const j = proto.steps.indexOf(viewer.at, proto.step);
        proto.step = j >= 0 ? j : Math.max(proto.step, proto.steps.indexOf(viewer.at));
      }
      const onPath = proto.steps[proto.step] === viewer.at;
      document.getElementById("proto-note").textContent = st ? noteOf(cur, st) : "";
      document.getElementById("proto-label").textContent = `${onPath && proto.flow ? `${proto.step + 1} / ${proto.steps.length} · ` : ""}${st && cur.states.length > 1 ? `${cur.label} · ${st}` : cur.label}`;
      // Keys pressed after a click in the screen go to the iframe: listen there too.
      frame.contentWindow.addEventListener("keydown", onViewerKey);
      // The row under the screen lists the steps of the current flow (or the states of the current screen), nothing else.
      const start = proto.groups.findLast((g) => g <= proto.step) ?? 0;
      const end = proto.groups.find((g) => g > proto.step) ?? proto.steps.length;
      document.getElementById("proto-states").innerHTML = end - start > 1 ? proto.steps.slice(start, end).map((key, j) => {
        const { s: xs, state: xst } = fromKey(key);
        return `<button class="btn" data-proto-step="${start + j}" aria-pressed="${onPath && start + j === proto.step}" data-tip="${esc(noteOf(xs, xst) || stepName(key))}">${esc(`${proto.flow ? `${j + 1} · ` : ""}${topic.screens.length === 1 || !proto.flow ? xst : stepName(key)}`)}</button>`;
      }).join("") : "";
    };
  };

  async function openViewer(mode, sel, at, { push = true, device = viewer.device, full = viewer.mode === "prototype" && viewer.full } = {}) {
    if (!topic.flows?.length || (sel !== "states" && !topic.flows[sel])) sel = "all";
    viewer.device = ENABLED.includes(device) ? device : DEFAULT_DEVICE;
    // Full screen lasts while the prototype stays open: restart, flow or state changes keep it.
    viewer.full = mode === "prototype" && full;
    if (mode === "canvas") await loadCamera();
    // The overlay animates in only when it opens, not when it switches mode or device.
    const fresh = !document.getElementById("canvas");
    closeViewer({ pop: true });
    Object.assign(viewer, { mode, sel: String(sel), at: at || (mode === "prototype" ? firstKey(sel) : null) });
    setUrl(push);
    document.body.insertAdjacentHTML("beforeend", `<div class="canvas${fresh ? " canvas--enter" : ""}" id="canvas" role="dialog" aria-label="${esc(topic.title)}">${bar()}</div>`);
    document.body.classList.add("canvas-open");
    const root = document.getElementById("canvas");
    mode === "canvas" ? mountCanvas(root) : mountPrototype(root);
    renderIcons(root);
    inspectMount();
  }

  function closeViewer({ pop = false } = {}) {
    const el = document.getElementById("canvas");
    if (!el) return;
    camera?.destroy();
    camera = null;
    // Closed by the user: the overlay fades out first. Replaced by another mode, or page hidden
    // (animations do not run there): it goes at once.
    el.removeAttribute("id");
    if (pop || document.hidden) el.remove();
    else {
      el.classList.add("is-closing");
      Promise.all(el.getAnimations().map((a) => a.finished)).then(() => el.remove());
    }
    document.body.classList.remove("canvas-open");
    viewer.mode = null;
    if (!pop) inspectToggle(false);
    if (!pop) {
      const url = new URL(location.href);
      for (const k of ["view", "flow", "at", "full"]) url.searchParams.delete(k);
      history.pushState(null, "", url);
    }
  }

  const syncViewer = () => {
    const p = new URLSearchParams(location.search);
    const mode = p.get("view");
    if (mode === "canvas" || mode === "prototype") openViewer(mode, p.get("flow") ?? "all", p.get("at"), { push: false, device: p.get("device") || DEFAULT_DEVICE, full: p.get("full") === "1" });
    else closeViewer({ pop: true });
  };
  addEventListener("popstate", syncViewer);
  // Prototype: P plays the next step, I highlights the links of the screen, a fake cursor clicking its link; → and ← jump to the next or previous step.
  // Without a flow, the steps are every screen and state, in order.
  const proto = { flow: false, steps: [], groups: [0], step: 0, start: null, busy: false };
  const CURSOR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2.5 19.5 11l-6.6 1.6-3.3 6.4z"/></svg>';
  const protoParts = () => ({ device: document.getElementById("proto-device"), doc: document.getElementById("proto-frame")?.contentDocument });
  // Screen pixels to device pixels: the screen is scaled down to fit.
  const onDevice = (el) => {
    const r = el.getBoundingClientRect();
    const k = protoParts().device.clientWidth / document.getElementById("proto-frame").offsetWidth;
    return { x: r.left * k, y: r.top * k, w: r.width * k, h: r.height * k };
  };
  // The link of the shown screen that leads to a step: same screen file, same state.
  const linkTo = (key) => {
    const { s, state } = fromKey(key);
    const want = state ? stateId(state) : "";
    return [...(protoParts().doc?.querySelectorAll("a[href]") || [])].find((a) => {
      const u = new URL(a.href);
      return u.pathname.endsWith(`/${s.file.split("/").pop()}`) && (u.searchParams.get("state") || (s.states?.length ? stateId(s.states[0]) : "")) === want;
    });
  };
  // Fake cursor: glides onto the element, presses (a ring spreads), then fades out. Resolves at the press.
  const pointAt = (el) => new Promise((resolve) => {
    const { device } = protoParts();
    device.querySelector(".proto__cursor")?.remove();
    const b = onDevice(el);
    const c = Object.assign(document.createElement("div"), { className: "proto__cursor", innerHTML: `<span class="proto__ring"></span>${CURSOR}` });
    Object.assign(c.style, { left: `${b.x + b.w / 2}px`, top: `${b.y + b.h / 2}px` });
    device.append(c);
    const slow = ms("--duration-slow");
    c.animate([{ transform: "translate(56px, 40px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: slow * 1.5, easing: motion("--ease-out"), fill: "both" }).finished.then(() => {
      c.classList.add("is-pressing");
      setTimeout(() => {
        resolve();
        c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: slow, delay: slow, fill: "both" }).finished.then(() => c.remove());
      }, ms("--duration-base"));
    });
  });
  // I: every link of the shown screen flashes, to see where a click can lead.
  const flashLinks = () => {
    const { device, doc } = protoParts();
    const links = [...(doc?.querySelectorAll("a[href]") || [])];
    if (!links.length) return toast("No link on this screen");
    for (const a of links) {
      const b = onDevice(a);
      const h = Object.assign(document.createElement("span"), { className: "proto__hotspot" });
      Object.assign(h.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
      device.append(h);
      h.addEventListener("animationend", () => h.remove());
    }
  };
  const stepName = (key) => { const { s, state } = fromKey(key); return state && s.states.length > 1 ? `${s.label} · ${state}` : s.label; };
  const show = (key, dir = 0) => { const { s, state } = fromKey(key); proto.load(screenUrl(s, state), dir); };
  const go = (dir) => {
    if (proto.busy) return;
    const key = proto.steps[proto.step + dir];
    if (key) {
      proto.step += dir;
      return show(key, dir);
    }
    // Past either end of a single flow: the next flow from its first step, or the previous one from its last step.
    const f = Number(viewer.sel) + dir;
    if (viewer.sel === "all" || !topic.flows?.[f]) return;
    const steps = topic.flows[f].steps;
    proto.start = dir > 0 ? 0 : steps.length - 1;
    const { s, state } = resolveStep(steps[proto.start]);
    openViewer("prototype", f, keyOf(s, state));
  };
  const hint = async () => {
    const next = proto.steps[proto.step + 1];
    if (!next) return toast(proto.flow ? "Last step of the flow" : "Last screen");
    if (proto.busy) return;
    const a = linkTo(next);
    if (!a) {
      toast(`${stepName(next)}: no click leads there (hover or system state)`);
      return go(1);
    }
    proto.busy = true;
    await pointAt(a);
    proto.busy = false;
    proto.step += 1;
    a.click();
  };

  // Canvas: ← and → select and frame the previous or next card, in reading order (unfolded states included).
  const stepCard = (dir) => {
    const cards = [...document.querySelectorAll(".canvas-card")];
    const i = cards.findIndex((c) => c.classList.contains("is-selected"));
    const next = cards[i < 0 ? (dir > 0 ? 0 : cards.length - 1) : Math.min(cards.length - 1, Math.max(0, i + dir))];
    if (!next) return;
    cards[i]?.classList.remove("is-selected");
    next.classList.add("is-selected");
    viewer.at = next.dataset.card;
    setUrl(false);
    camera.frame(next, true);
  };
  const bareToggle = () => {
    const bare = document.getElementById("canvas").classList.toggle("is-bare");
    if (bare) toast("H or Esc brings the interface back");
  };
  const kbd = (key, text) => `<dt><span class="kbd">${key}</span></dt><dd>${text}</dd>`;
  const help = () => {
    const box = document.getElementById("viewer-help");
    if (box) return box.showModal();
    document.body.insertAdjacentHTML("beforeend", `<dialog class="modal viewer-help" id="viewer-help" aria-labelledby="viewer-help-title">
      <div class="dialog__head"><h2 class="dialog__title" id="viewer-help-title">Shortcuts</h2><button class="btn" data-variant="icon" data-close aria-label="Close">${icon("x")}</button></div>
      <div class="dialog__body"><h3>Canvas</h3><dl>${kbd("Wheel", "Pan")}${kbd("Ctrl/Cmd + wheel", "Zoom")}${kbd("Double-click", "Focus a screen")}${kbd("O", "Fit every screen")}${kbd("H", "Hide the interface")}${kbd("← →", "Move between screens")}</dl>
      <h3>Prototype</h3><dl>${kbd("P", "Play the next step")}${kbd("I", "Highlight the links")}${kbd("F", "Full screen")}${kbd("← →", "Move between steps")}</dl>
      <h3>Both</h3><dl>${kbd("V", "Inspect a part")}${kbd("?", "This help")}${kbd("Esc", "Close, one level at a time")}</dl></div></dialog>`);
    renderIcons();
    document.getElementById("viewer-help").showModal();
  };
  // One handler for the page and for the screen shown in Prototype mode.
  function onViewerKey(e) {
    if (!document.getElementById("canvas")) return;
    // The help dialog takes Esc itself, and the viewer behind it stays still.
    if (document.getElementById("viewer-help")?.open) return;
    // Esc unpins the inspected part, then leaves the inspector, before it closes anything else.
    if (e.key === "Escape" && inspect.on) return inspect.pinned ? ((inspect.pinned = null), panel()) : inspectToggle(false);
    if (e.key === "Escape" && document.querySelector(".canvas.is-bare")) return bareToggle();
    if (e.key === "Escape") return viewer.full ? openViewer("prototype", viewer.sel, viewer.at, { push: false, full: false }) : closeViewer();
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.("input,select,textarea")) return;
    if (e.key === "?") return help();
    if (e.key.toLowerCase() === "v") return inspectToggle();
    // O fits every screen in view, H hides the interface around it.
    if (viewer.mode === "canvas" && e.key.toLowerCase() === "o") return camera.fit(true);
    if (viewer.mode === "canvas" && e.key.toLowerCase() === "h") return bareToggle();
    const dir = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (dir) {
      e.preventDefault();
      viewer.mode === "canvas" ? stepCard(dir) : go(dir);
    } else if (e.key.toLowerCase() === "p" && viewer.mode === "prototype") hint();
    else if (e.key.toLowerCase() === "i" && viewer.mode === "prototype") flashLinks();
    // F toggles full screen, as the button does.
    else if (e.key.toLowerCase() === "f" && viewer.mode === "prototype") openViewer("prototype", viewer.sel, viewer.at, { push: false, full: !viewer.full });
  }
  addEventListener("keydown", onViewerKey);
  document.addEventListener("change", (e) => {
    if (e.target.id === "canvas-view") openViewer(viewer.mode, e.target.value, null);
    if (e.target.id === "canvas-brand") setBrand(e.target.value);
  });
  // In place: the camera stays where it is, to compare two brands on the same screen.
  const setBrand = (name) => {
    shownBrand = name;
    const frames = [...document.querySelectorAll("iframe")];
    frames.forEach(brandScreen);
    setUrl(false);
    Promise.all(frames.map((f) => f.brandReady)).then(() => { sheets = new WeakMap(); matching = new WeakMap(); inspect.shown = 0; });
  };
  document.addEventListener("click", (ev) => {
    if (!document.getElementById("canvas")) return;
    if (ev.target.closest("[data-viewer-close]")) closeViewer();
    if (ev.target.closest("[data-inspect]")) inspectToggle();
    if (ev.target.closest("[data-help]")) help();
    const modeBtn = ev.target.closest("[data-mode]");
    if (modeBtn && modeBtn.dataset.mode !== viewer.mode) openViewer(modeBtn.dataset.mode, viewer.sel, viewer.at);
    const flowFocus = ev.target.closest("[data-flow-focus]");
    if (flowFocus) openViewer("canvas", flowFocus.dataset.flowFocus, null);
    const flowPlay = ev.target.closest("[data-flow-play]");
    if (flowPlay) openViewer("prototype", flowPlay.dataset.flowPlay, null);
    if (ev.target.closest("[data-restart]")) openViewer("prototype", viewer.sel, firstKey(viewer.sel), { push: false });
    if (ev.target.closest("[data-full]")) openViewer("prototype", viewer.sel, viewer.at, { push: false, full: !viewer.full });
    const deviceBtn = ev.target.closest("[data-device]");
    if (deviceBtn && deviceBtn.dataset.device !== viewer.device) openViewer(viewer.mode, viewer.sel, viewer.at, { push: false, device: deviceBtn.dataset.device });
    const protoStep = ev.target.closest("[data-proto-step]");
    if (protoStep) {
      proto.step = Number(protoStep.dataset.protoStep);
      show(proto.steps[proto.step]);
    }
    const zoomBtn = ev.target.closest("[data-zoom]");
    if (zoomBtn) {
      const z = zoomBtn.dataset.zoom;
      z === "fit" ? camera.fit(true) : camera.scale(camera.zoom * (z === "in" ? 1.25 : 0.8));
    }
    // Canvas: a click selects a card (the screen Prototype starts from).
    const cardEl = viewer.mode === "canvas" && ev.target.closest(".canvas-card");
    if (cardEl) {
      document.querySelectorAll(".canvas-card.is-selected").forEach((c) => c.classList.remove("is-selected"));
      cardEl.classList.add("is-selected");
      viewer.at = cardEl.dataset.card;
      setUrl(false);
    }
  });
  // Canvas: a double-click on a card focuses it (zoom to fit that screen).
  document.addEventListener("dblclick", (ev) => {
    const cardEl = viewer.mode === "canvas" && ev.target.closest(".canvas-card");
    if (cardEl) camera.frame(cardEl, true);
  });

  // ---- Inspector (V): hover a part of a screen to read what it is made of, click to pin it -------------------------
  // Canvas and Prototype. A color, a size or a spacing gives the token the winning CSS rule declares (its var(--…)),
  // not a guess from the value; a value written without a token says "no token". In Prototype a layer over the screen
  // takes the pointer: links do not fire while inspecting, the wheel still scrolls the screen.
  const inspect = { on: false, hover: null, pinned: null, shown: 0, raf: 0 };
  let sheets = new WeakMap();
  // Every style rule of a screen, in cascade order, through @import and the @media that apply; and the :root custom
  // properties, the tokens. Cached per document: a new state is a new document.
  const rulesOf = (doc) => {
    if (sheets.has(doc)) return sheets.get(doc);
    const rules = [], roots = new Set();
    // A sheet from another origin (Google Fonts) cannot be read: it is skipped, the rest of its parent still counts.
    // Rule types come from the screen's own window: an iframe's rules are not instances of this page's classes.
    const W = doc.defaultView;
    const read = (sheet) => { try { return sheet.cssRules; } catch { return []; } };
    const walk = (list) => {
      for (const r of list) {
        if (r instanceof W.CSSImportRule) { if (r.styleSheet) walk(read(r.styleSheet)); }
        else if (r instanceof W.CSSStyleRule) {
          rules.push(r);
          if (r.selectorText.includes(":root")) for (const p of r.style) if (p.startsWith("--")) roots.add(p);
        } else if (r instanceof W.CSSMediaRule) { if (W.matchMedia(r.media.mediaText).matches) walk(r.cssRules); }
        else if (r.cssRules) walk(r.cssRules);
      }
    };
    for (const sheet of doc.styleSheets) walk(read(sheet));
    const out = { rules, roots };
    sheets.set(doc, out);
    return out;
  };
  const splitList = (list) => {
    const out = [];
    let depth = 0, cur = "";
    for (const ch of list) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += ch;
    }
    return [...out, cur.trim()];
  };
  // Selector weight, close enough to the cascade's: :where() counts nothing, :is() :not() :has() count their argument.
  const specificity = (sel) => {
    let b = 0;
    sel = sel.replace(/\[[^\]]*\]/g, () => { b++; return " "; }).replace(/:where\((?:[^()]|\([^()]*\))*\)/g, " ")
      .replace(/:(?:is|not|has)\(((?:[^()]|\([^()]*\))*)\)/g, " $1 ").replace(/:[\w-]+\([^()]*\)/g, () => { b++; return " "; });
    const a = (sel.match(/#[\w-]+/g) || []).length;
    b += (sel.match(/\.[\w-]+|:[\w-]+/g) || []).length;
    const c = (sel.match(/(?:^|[\s>+~])[a-z][\w-]*/gi) || []).length;
    return a * 1e6 + b * 1e3 + c;
  };
  const matchSpec = (el, list) => {
    let best = -1;
    for (const sel of splitList(list)) {
      if (sel.includes("::")) continue;
      try { if (el.matches(sel)) best = Math.max(best, specificity(sel)); } catch {}
    }
    return best;
  };
  // The text of the declaration that wins for one of these properties (longhand first, then its shorthands).
  // Inherited properties (color, font) walk up to the first ancestor that declares them.
  // The rules that match an element, with their weight, in cascade order: matched once per element.
  let matching = new WeakMap();
  const rulesFor = (el) => {
    if (!matching.has(el)) matching.set(el, rulesOf(el.ownerDocument).rules.map((r) => ({ r, spec: matchSpec(el, r.selectorText) })).filter((m) => m.spec >= 0));
    return matching.get(el);
  };
  const declared = (el, props, inherited = false) => {
    for (let node = el; node; node = inherited ? node.parentElement : null) {
      for (const p of props) { const v = node.style?.getPropertyValue(p); if (v) return v.trim(); }
      let best = null;
      for (const { r, spec } of rulesFor(node)) {
        const text = props.map((p) => r.style.getPropertyValue(p)).find(Boolean);
        if (text && (!best || spec >= best.spec)) best = { text, spec };
      }
      if (best) return best.text.trim();
    }
    return "";
  };
  // var(--x) becomes --x. A component's own variable (--btn-error, --bar-inset) is replaced by what it holds, down to the token.
  const tokenText = (el, text, depth = 0) => text.replace(/var\((--[\w-]+)(?:\s*,[^()]*)?\)/g, (m, name) => {
    if (rulesOf(el.ownerDocument).roots.has(name) || depth > 2) return name;
    const own = declared(el, [name], true);
    return own ? tokenText(el, own, depth + 1) : name;
  });
  // The token for a property: the declaration with its var() resolved, or one of its tokens for a shorthand (font).
  const tokenOf = (el, props, { inherited = false, pick } = {}) => {
    const text = tokenText(el, declared(el, props, inherited));
    if (pick) return (text.match(/--[\w-]+/g) || []).find((n) => pick.test(n)) || "";
    return text.includes("--") ? text : "";
  };
  // rgb(), rgba() and color(srgb …) (what color-mix() computes to) as #RRGGBB, with the alpha in % when it is not opaque.
  const hex = (c) => {
    const m = c.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/) || c.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)$/);
    if (!m) return c;
    const k = c.startsWith("color") ? 255 : 1;
    const h = `#${m.slice(1, 4).map((v) => Math.round(Math.min(255, Math.max(0, v * k))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    return m[4] !== undefined && Number(m[4]) < 1 ? `${h} ${Math.round(m[4] * 100)}%` : h;
  };
  const clear = (c) => c === "transparent" || /^rgba\(.*,\s*0\)$/.test(c) || / \/ 0\)$/.test(c);
  const row = (key, token, value, swatch) => `<button class="inspect__row" type="button" data-copy="${esc(token || value)}" title="${esc(token ? `${token} · ${value}` : value)}"><span class="inspect__key">${key}</span><span class="inspect__val">${swatch ? `<i class="inspect__swatch" style="background:${esc(swatch)}"></i>` : ""}${token ? `<b>${esc(token)}</b><small>${esc(value)}</small>` : `<b class="is-raw">${esc(value)}</b><small>no token</small>`}</span></button>`;
  const plain = (key, value) => `<button class="inspect__row" type="button" data-copy="${esc(value)}"><span class="inspect__key">${key}</span><span class="inspect__val"><b>${esc(value)}</b></span></button>`;
  const part = (title, rows) => rows.filter(Boolean).length ? `<div class="inspect__group"><p class="inspect__title">${title}</p>${rows.filter(Boolean).join("")}</div>` : "";
  // A selector for the part: its class or tag, up to three levels, with the position among identical siblings.
  const selectorOf = (el) => {
    const path = [];
    for (let n = el; n && n !== el.ownerDocument.body && path.length < 3; n = n.parentElement) {
      const siblings = [...n.parentElement.children];
      const twin = siblings.filter((x) => x.tagName === n.tagName && x.className === n.className).length > 1;
      path.unshift(`${n.classList[0] ? `.${n.classList[0]}` : n.tagName.toLowerCase()}${twin ? `:nth-child(${siblings.indexOf(n) + 1})` : ""}`);
    }
    return path.join(" > ");
  };
  // One line that tells the agent which part of which screen is meant, pasted into its prompt.
  const referenceOf = (t, html) => {
    const [id, state] = (viewer.mode === "canvas" ? t.frame.closest(".canvas-card").dataset.card : viewer.at).split(":");
    const text = t.el.textContent.trim().replace(/\s+/g, " ").slice(0, 40);
    const tokens = [...new Set([...html.matchAll(/data-copy="([^"]*)"/g)].flatMap((m) => m[1].match(/--[\w-]+/g) || []))];
    return [`screen:${id}`, state && `state:${state}`, `theme:${theme}`, BRANDS.length > 1 && `brand:${stateId(shownBrand)}`, `part:${selectorOf(t.el)}`, text && `text:"${text}"`, tokens.length && `tokens:${tokens.join(",")}`].filter(Boolean).join(" ");
  };
  const describe = (t) => {
    const { el } = t;
    const cs = el.ownerDocument.defaultView.getComputedStyle(el), box = el.getBoundingClientRect();
    const name = `${el.tagName.toLowerCase()}${[...el.classList].map((c) => `.${c}`).join("")}`;
    const attrs = ["data-variant", "data-size", "data-icon-style", "aria-pressed", "aria-expanded", "aria-selected", "aria-current", "aria-invalid", "disabled"]
      .filter((a) => el.hasAttribute(a)).map((a) => (el.getAttribute(a) ? `${a}="${el.getAttribute(a)}"` : a)).join(" ");
    // The icon: the part itself, or the icon a button or a link holds directly.
    const iconEl = el.closest("[data-icon]") || el.querySelector(":scope > [data-icon]");
    const texty = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el.matches("input, textarea, select, button");
    const side = ["top", "right", "bottom", "left"].find((sd) => parseFloat(cs.getPropertyValue(`border-${sd}-width`)) > 0);
    const sides = side && ["top", "right", "bottom", "left"].every((sd) => cs.getPropertyValue(`border-${sd}-width`) === cs.getPropertyValue(`border-${side}-width`));
    const borderColor = side && cs.getPropertyValue(`border-${side}-color`);
    const spaced = (v) => v && !/^(0px ?)+$/.test(v) && v !== "normal";
    const parts = `${part("Icon", [iconEl && plain("Name", iconEl.dataset.icon + (iconEl.dataset.iconStyle ? ` · ${iconEl.dataset.iconStyle}` : "")),
        iconEl && plain("Size", `${Math.round(iconEl.getBoundingClientRect().height)}px`)])}
      ${texty ? part("Type", [
        row("Font", tokenOf(el, ["font-family", "font"], { inherited: true, pick: /^--font-family/ }), cs.fontFamily.split(",")[0].replace(/"/g, "")),
        row("Size", tokenOf(el, ["font-size", "font"], { inherited: true, pick: /^--font-size/ }), cs.fontSize),
        row("Weight", tokenOf(el, ["font-weight", "font"], { inherited: true, pick: /^--font-weight/ }), cs.fontWeight),
        row("Line height", tokenOf(el, ["line-height", "font"], { inherited: true, pick: /^--line-height/ }), cs.lineHeight),
        row("Color", tokenOf(el, ["color"], { inherited: true }), hex(cs.color), cs.color)]) : ""}
      ${part("Fill and border", [
        !clear(cs.backgroundColor) && row("Fill", tokenOf(el, ["background-color", "background"]), hex(cs.backgroundColor), cs.backgroundColor),
        side && row(sides ? "Border" : `Border ${side}`, tokenOf(el, [`border-${side}-color`, `border-${side}`, "border-color", "border"]), `${cs.getPropertyValue(`border-${side}-width`)} ${hex(borderColor)}`, borderColor),
        cs.boxShadow !== "none" && row("Shadow", tokenOf(el, ["box-shadow"]), cs.boxShadow),
        Number(cs.opacity) < 1 && plain("Opacity", cs.opacity)])}
      ${part("Layout", [
        spaced(cs.padding) && row("Padding", tokenOf(el, ["padding", "padding-top", "padding-left", "padding-block", "padding-inline"]), cs.padding),
        /flex|grid/.test(cs.display) && spaced(cs.gap) && row("Gap", tokenOf(el, ["gap", "row-gap", "column-gap"]), cs.gap),
        spaced(cs.borderRadius) && row("Radius", tokenOf(el, ["border-radius", "border-top-left-radius"]), cs.borderRadius)])}`;
    const reference = referenceOf(t, parts);
    return `<div class="inspect__head"><b>${esc(name)}</b>${attrs ? `<small>${esc(attrs)}</small>` : ""}<small>${Math.round(box.width)} × ${Math.round(box.height)}</small></div>
      <div class="inspect__group"><button class="inspect__row" type="button" data-copy="${esc(reference)}" data-copy-label="the reference for your agent" title="${esc(reference)}"><span class="inspect__key">Reference</span><span class="inspect__val"><b>${esc(reference)}</b></span></button></div>
      ${parts}`;
  };
  // The part of a screen under the pointer: the card's frame in Canvas, the screen under the layer in Prototype.
  const hit = (e) => {
    const frame = viewer.mode === "canvas" ? e.target.closest?.(".canvas-card")?.querySelector("iframe")
      : e.target.closest?.(".inspect__catcher") && document.getElementById("proto-frame");
    const doc = frame?.contentDocument;
    if (!doc) return null;
    const f = frame.getBoundingClientRect(), k = f.width / frame.offsetWidth;
    let el = doc.elementFromPoint((e.clientX - f.left) / k, (e.clientY - f.top) / k);
    el = el?.closest("svg")?.parentElement || el;
    return el && el !== doc.body && el !== doc.documentElement ? { frame, el } : null;
  };
  const panel = () => {
    const box = document.getElementById("inspect-panel");
    const t = inspect.pinned || inspect.hover;
    if (!box || t?.el === inspect.shown) return;
    inspect.shown = t?.el;
    box.innerHTML = t ? describe(t) : '<p class="inspect__empty">Hover a part of a screen to read its tokens, icon and type. Click to pin it, Esc to unpin. Click a value to copy it.</p>';
  };
  // Boxes follow the camera and the screen's own scroll: redrawn every frame while the inspector is on.
  const place = (id, t, cls) => {
    let el = document.getElementById(id);
    if (!t) return el?.remove();
    const f = t.frame.getBoundingClientRect(), k = f.width / t.frame.offsetWidth, r = t.el.getBoundingClientRect();
    if (!el) document.getElementById("canvas")?.append((el = Object.assign(document.createElement("div"), { id, className: cls })));
    Object.assign(el.style, { left: `${f.left + r.left * k}px`, top: `${f.top + r.top * k}px`, width: `${r.width * k}px`, height: `${r.height * k}px` });
    return el;
  };
  const tick = () => {
    if (!inspect.on) return;
    for (const key of ["hover", "pinned"]) if (inspect[key] && !(inspect[key].el.isConnected && inspect[key].frame.isConnected)) inspect[key] = null;
    panel();
    const hover = inspect.hover?.el !== inspect.pinned?.el ? inspect.hover : null;
    place("inspect-pin", inspect.pinned, "inspect__box is-pinned");
    const b = place("inspect-hover", hover, "inspect__box");
    let tag = document.getElementById("inspect-tag");
    if (!b) tag?.remove();
    else {
      if (!tag) document.getElementById("canvas")?.append((tag = Object.assign(document.createElement("div"), { id: "inspect-tag", className: "inspect__tag" })));
      const r = hover.el.getBoundingClientRect(), label = `${hover.el.classList[0] || hover.el.tagName.toLowerCase()} · ${Math.round(r.width)} × ${Math.round(r.height)}`;
      if (tag.textContent !== label) tag.textContent = label;
      const top = parseFloat(b.style.top);
      Object.assign(tag.style, { left: b.style.left, top: `${top - 22 < 64 ? top + parseFloat(b.style.height) + 4 : top - 22}px` });
    }
    // The panel leaves the top right corner when the inspected part sits under it, and comes back once it is clear.
    const box = document.getElementById("inspect-panel"), part = (b || document.getElementById("inspect-pin"))?.getBoundingClientRect();
    if (box) {
      const corner = innerWidth - 12 - box.offsetWidth, bottom = box.offsetTop + box.offsetHeight;
      box.toggleAttribute("data-left", !!part && part.right > corner && part.top < bottom);
    }
    inspect.raf = requestAnimationFrame(tick);
  };
  // After each render of the viewer: the button state, the panel, the layer over the prototype screen.
  function inspectMount() {
    const root = document.getElementById("canvas");
    cancelAnimationFrame(inspect.raf);
    document.querySelectorAll(".inspect, .inspect__box, .inspect__tag, .inspect__catcher").forEach((n) => n.remove());
    if (!root) return;
    root.classList.toggle("is-inspecting", inspect.on);
    root.querySelector("[data-inspect]")?.setAttribute("aria-pressed", String(inspect.on));
    if (!inspect.on) return;
    root.insertAdjacentHTML("beforeend", '<aside class="inspect" id="inspect-panel" aria-label="Inspector"></aside>');
    document.getElementById("proto-device")?.insertAdjacentHTML("beforeend", '<div class="inspect__catcher"></div>');
    inspect.shown = 0;
    tick();
  }
  function inspectToggle(on = !inspect.on) {
    Object.assign(inspect, { on, hover: null, pinned: null });
    inspectMount();
  }
  document.addEventListener("pointermove", (e) => {
    if (!inspect.on || e.target.closest?.(".inspect")) return;
    inspect.hover = hit(e);
  }, { passive: true });
  document.addEventListener("click", (e) => {
    if (!inspect.on || !document.getElementById("canvas")) return;
    const copy = e.target.closest("[data-copy]");
    if (copy) return navigator.clipboard.writeText(copy.dataset.copy).then(() => {
      toast(`Copied ${copy.dataset.copyLabel || copy.dataset.copy}`);
      copy.querySelector(".inspect__done")?.remove();
      copy.toggleAttribute("data-copied", true);
      copy.querySelector(".inspect__val").insertAdjacentHTML("beforeend", '<span class="inspect__done">Copied</span>');
      clearTimeout(copy.done);
      copy.done = setTimeout(() => { copy.removeAttribute("data-copied"); copy.querySelector(".inspect__done")?.remove(); }, 1500);
    }, () => toast("Clipboard blocked, click again"));
    if (e.target.closest(".inspect, .canvas__bar")) return;
    const t = hit(e);
    inspect.pinned = t && t.el !== inspect.pinned?.el ? t : null;
    panel();
  });
  // The layer over the prototype screen passes the wheel on: the nearest scrolling box under the pointer scrolls.
  document.addEventListener("wheel", (e) => {
    if (!e.target.closest?.(".inspect__catcher")) return;
    const t = hit(e);
    if (!t) return;
    const win = t.frame.contentWindow;
    let n = t.el;
    while (n && n !== n.ownerDocument.body && !(n.scrollHeight > n.clientHeight && /auto|scroll/.test(win.getComputedStyle(n).overflowY))) n = n.parentElement;
    (n && n !== n.ownerDocument.body ? n : t.frame.contentDocument.scrollingElement).scrollBy(e.deltaX, e.deltaY);
  }, { passive: true });

  // Same converter and pinned version as the lean-proto Studio: native Figma clipboard, auto-layout frames.
  const FIGIT_CDN = "https://cdn.jsdelivr.net/npm/@figit/dom-to-figma@0.2.4/+esm";
  // Before a copy, the screen's DOM is shaped so the converter can mirror CSS flex as Figma auto-layout: it gives up
  // on a container holding bare text, so every text run gets its own <span>, and a filled box holding text only
  // (a pill, a badge) becomes a centered flex box. Rendering is unchanged; only the copy's frames change.
  const prepareForFigma = (doc) => {
    const win = doc.defaultView;
    for (const el of doc.body.querySelectorAll("*")) {
      if (el.closest("svg")) continue;
      const style = win.getComputedStyle(el);
      const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
      if (!texts.length) continue;
      const filled = style.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(style.borderTopWidth) > 0;
      // Blocks only: a table cell or a list item turned into a flex box loses its place in the table or the list.
      if (["block", "inline-block"].includes(style.display) && filled && el.children.length === 0) {
        el.style.display = style.display === "block" ? "flex" : "inline-flex";
        el.style.alignItems = "center";
      }
      if (!el.style.display.includes("flex") && !style.display.includes("flex")) continue;
      for (const t of texts) {
        const span = doc.createElement("span");
        t.replaceWith(span);
        span.append(t);
      }
    }
  };
  // The converter's own encoder: used to re-encode a copy after wrapping its frames in a section.
  const KIWI_CDN = "https://cdn.jsdelivr.net/npm/@figit/fig-kiwi@0.2.0/+esm";
  // The converter pastes frames straight on the canvas. A flow goes in a Figma section named after it:
  // a SECTION node is added to the document, the frames become its children, then the document is re-encoded.
  // Layers named after the component that drew them (filter__button, menu__row, card) instead of "Container":
  // the converter's trace maps every node back to its DOM element, whose first class becomes the layer name.
  // The same pass fixes what the converter gets wrong in Figma: clipping of scrolling boxes, text resizing.
  const GENERIC = new Set(["Container", "Section", "Button", "Navigation", "Header", "Footer", "Sidebar"]);
  const nameLayers = (result, roots) => {
    const nodes = new Map(result.document.nodeChanges.map((n) => [n.guid.localID, n]));
    const CANVAS = 1;
    // Each traced node belongs to the frame found by walking up to the canvas; frames come in input order.
    const frameIds = result.document.nodeChanges.filter((n) => n.type === "FRAME" && n.parentIndex?.guid?.localID === CANVAS).map((n) => n.guid.localID).sort((a, b) => a - b);
    const frameOf = (node) => {
      for (let n = node; n; n = nodes.get(n.parentIndex?.guid?.localID)) if (n.parentIndex?.guid?.localID === CANVAS) return frameIds.indexOf(n.guid.localID);
      return 0;
    };
    for (const entry of result.trace?.entries || []) {
      const node = nodes.get(entry.guid.localID);
      if (!node || entry.tag === "#text") continue;
      const root = roots[Math.max(0, frameOf(node))];
      let el = null;
      try { el = entry.domPath === ":scope" ? root : root.querySelector(entry.domPath); } catch {}
      if (!el) continue;
      if (GENERIC.has(node.name)) {
        const name = [...el.classList].find((c) => !c.startsWith("is-"));
        if (name) node.name = name;
      }
      // A box that scrolls or clips (a wide table) clips in Figma too, instead of spilling over the page.
      const cs = el.ownerDocument.defaultView.getComputedStyle(el);
      if ([cs.overflowX, cs.overflowY].some((o) => o !== "visible")) node.frameMaskDisabled = false;
    }
    // Texts come out as fixed boxes measured in the browser; Figma's metrics differ by a pixel and the last word wraps.
    // One-line texts hug their content (auto width), longer ones keep their width and grow in height.
    for (const node of result.document.nodeChanges) {
      if (node.type !== "TEXT") continue;
      const line = node.lineHeight?.units === "PIXELS" ? node.lineHeight.value : (node.fontSize || 14) * 1.25;
      node.textAutoResize = node.size.y < line * 1.5 ? "WIDTH_AND_HEIGHT" : "HEIGHT";
    }
  };
  // The converter pastes frames straight on the canvas. Each flow goes in a black Figma section named after it:
  // a SECTION node per group of consecutive frames (frames come in input order), the frames become its children.
  const wrapInSections = (doc, groups) => {
    const CANVAS = 1, PAD = 80;
    const frames = doc.nodeChanges.filter((n) => n.type === "FRAME" && n.parentIndex?.guid?.localID === CANVAS).sort((a, b) => a.guid.localID - b.guid.localID);
    let next = Math.max(...doc.nodeChanges.map((n) => n.guid?.localID || 0)) + 1, first = 0;
    for (const { name, count } of groups) {
      const own = frames.slice(first, first += count);
      const left = Math.min(...own.map((f) => f.transform.m02)) - PAD, top = Math.min(...own.map((f) => f.transform.m12)) - PAD;
      const right = Math.max(...own.map((f) => f.transform.m02 + f.size.x)) + PAD, bottom = Math.max(...own.map((f) => f.transform.m12 + f.size.y)) + PAD;
      const guid = { sessionID: 0, localID: next++ };
      const section = {
        guid, phase: "CREATED", parentIndex: { guid: { sessionID: 0, localID: CANVAS }, position: "!" }, type: "SECTION", name,
        visible: true, opacity: 1, blendMode: "PASS_THROUGH", size: { x: right - left, y: bottom - top },
        transform: { m00: 1, m01: 0, m02: left, m10: 0, m11: 1, m12: top },
        fillPaints: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true, blendMode: "NORMAL" }],
      };
      for (const f of own) {
        f.parentIndex = { guid, position: f.parentIndex.position };
        f.transform = { ...f.transform, m02: f.transform.m02 - left, m12: f.transform.m12 - top };
      }
      doc.nodeChanges.splice(doc.nodeChanges.indexOf(own[0]), 0, section);
    }
  };
  // Converts, renames the layers, wraps each flow in its section, then re-encodes with the converter's own encoder.
  const toFigma = async (input, roots, groups) => {
    converter ??= (await import(FIGIT_CDN)).createFigmaConverter({ trace: true });
    roots.forEach((root) => prepareForFigma(root.ownerDocument));
    const result = await converter.convert(input);
    const { encodeFigmaData, composeClipboardHtml } = await import(KIWI_CDN);
    nameLayers(result, roots);
    if (groups) wrapInSections(result.document, groups);
    return new Blob([composeClipboardHtml(encodeFigmaData(result.document).base64)], { type: "text/html" });
  };
  let converter = null;
  // One screen as one frame: a thumbnail (its first state) or the screen shown in the Prototype, in the current theme.
  async function copyScreenToFigma(doc, name, width, height) {
    if (!navigator.clipboard?.write || !doc?.body) return toast("Clipboard blocked");
    try {
      const html = await toFigma({ element: doc.body, width, height, name }, [doc.body]);
      await navigator.clipboard.write([new ClipboardItem({ "text/html": html })]);
      toast("Copied for Figma, paste with Ctrl+V");
    } catch (e) {
      console.error(e);
      toast(e?.name === "NotAllowedError" ? "Clipboard blocked, click again" : "Figma export failed");
    }
  }
  const copyToFigma = (id) => {
    const s = topic.screens.find((x) => x.id === id);
    const state = s.states?.[0];
    copyScreenToFigma(document.querySelector(`[data-screen="${id}"] iframe`).contentDocument, state ? `${s.label} · ${state}` : s.label, vp.width, vp.height);
  };

  // Loads a screen in a given state in an off-screen iframe, at the topic viewport, ready to convert.
  const newStage = () => {
    const stage = document.createElement("div");
    stage.style.cssText = "position:fixed;left:-100000px;top:0;display:flex;gap:40px;pointer-events:none";
    return document.body.appendChild(stage);
  };
  const loadStep = (stage, s, state, { width, height }) => new Promise((resolve) => {
    const frame = Object.assign(document.createElement("iframe"), { width, height });
    frame.style.border = "0";
    frame.onload = async () => {
      themeScreen(frame);
      await frame.brandReady;
      await frame.contentDocument.fonts.ready;
      await frame.contentWindow.iconsReady;
      // A timer, not animation frames: a hidden tab gets none.
      setTimeout(() => resolve(frame), 50);
    };
    frame.src = screenUrl(s, state);
    stage.append(frame);
  });

  // One paste, one frame per step, side by side, one section per flow; all flows stack their sections. Converting takes
  // seconds and the browser only writes the clipboard while the page keeps focus, so the conversion starts on hover and
  // the click writes a ready result.
  const prepared = new Map();
  const prepareFlows = (flows) => {
    const dim = viewer.mode ? size() : vp;
    const key = `${flows.map((f) => topic.flows.indexOf(f)).join(",")}@${dim.width}x${dim.height}@${theme}`;
    if (prepared.has(key)) return prepared.get(key);
    const GAP = 80, ROW = dim.height + 3 * GAP;
    const job = (async () => {
      const stage = newStage();
      try {
        const steps = flows.flatMap((flow, row) => flow.steps.map((step, i) => ({ flow, step, row, i })));
        const frames = await Promise.all(steps.map(({ step }) => {
          const { s, state } = resolveStep(step);
          return loadStep(stage, s, state, dim);
        }));
        const roots = frames.map((frame) => frame.contentDocument.body);
        return await toFigma({
          canvasName: flows.length > 1 ? topic.title : flows[0].name || topic.title,
          frames: roots.map((body, k) => {
            const { step, row, i } = steps[k];
            return { element: body, width: dim.width, height: dim.height, x: i * (dim.width + GAP), y: row * ROW, name: `${i + 1} · ${stepLabel(step)}` };
          }),
        }, roots, flows.map((flow) => ({ name: flow.name || topic.title, count: flow.steps.length })));
      } finally {
        stage.remove();
      }
    })();
    job.catch(() => prepared.delete(key));
    prepared.set(key, job);
    return job;
  };
  const prepareFlow = (flow) => prepareFlows([flow]);
  document.addEventListener("pointerover", (ev) => {
    if (!LOCAL) return;
    if (ev.target.closest("[data-figma-all]")) return prepareFlows(topic.flows);
    const btn = ev.target.closest(".flow")?.querySelector("[data-figma-flow]"); // deliverable cards share .flow, without a flow
    if (btn) prepareFlow(topic.flows[btn.dataset.figmaFlow]);
  });

  async function copyFlowsToFigma(flows) {
    if (!navigator.clipboard?.write) return toast("Clipboard blocked");
    const count = flows.reduce((n, f) => n + f.steps.length, 0);
    const html = prepareFlows(flows);
    const ready = await Promise.race([html.then(() => true), new Promise((r) => setTimeout(() => r(false), 50))]);
    if (!ready) toast(`Preparing ${count} screens, stay on this page…`);
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": html })]);
      toast(`${count} screens${flows.length > 1 ? ` in ${flows.length} sections` : ""} copied for Figma, paste with Ctrl+V`);
    } catch (e) {
      console.error(e);
      toast(e?.name === "NotAllowedError" ? "Copy failed: the page lost focus, click again" : "Figma export failed");
    }
  }
  const copyFlowToFigma = (flow) => copyFlowsToFigma([flow]);
  // A shared canvas link opens straight on the canvas.
  syncViewer();
})();
