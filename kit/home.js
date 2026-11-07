// Home of the site root index.html: the most recent topics of every group, then one card per group of
// protopass.json → groups with its latest topics and its count per status, all read from the groups' topics.json.
(async () => {
  const KIT = new URL(".", document.currentScript.src);
  const ROOT = new URL("..", KIT);
  const STATUS = { draft: "Draft", review: "In review", ready: "Ready", shipped: "Shipped" };
  const TONE = { draft: "warning", review: "accent", ready: "success" };
  const RECENT = 4;
  const LATEST = 3;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const get = (url) => fetch(url, { cache: "no-store" }).then((r) => r.json());
  const site = await get(new URL("protopass.json", ROOT));

  document.head.append(Object.assign(document.createElement("link"), { rel: "icon", href: new URL("favicon.svg", KIT) }));
  document.title = "Protopass";
  document.getElementById("brand").innerHTML = `<i class="brand__mark"></i><b>Protopass</b>`;
  document.getElementById("title").textContent = "The open-source prototype kit for your coding agent.";
  document.getElementById("intro").textContent = "Click through your idea before you build the app.";

  // Every topic of every group, newest first. A topic with screens opens on its topic page, a free prototype on its own entry point.
  const byDate = (a, b) => (b.updated || "").localeCompare(a.updated || "");
  const groups = await Promise.all(site.groups.map(async (g) => {
    const base = new URL(`${g.path}/`, ROOT);
    const topics = await Promise.all((await get(new URL("topics.json", base))).map((p) => get(new URL(`${p}/topic.json`, base)).then((t) => ({
      ...t,
      group: g,
      base: new URL(`${p}/`, base).href,
      href: new URL(t.screens?.length || !t.prototype ? `${p}/` : `${p}/${t.prototype}`, base).href,
    }))));
    return { ...g, base, topics: topics.sort(byDate) };
  }));
  const all = groups.flatMap((g) => g.topics).sort(byDate);

  const icon = (name) => `<i class="icon" data-icon="${name}"></i>`;
  const badge = (t) => `<span class="badge"${TONE[t.status] ? ` data-variant="${TONE[t.status]}"` : ""}>${STATUS[t.status] || esc(t.status)}</span>`;

  // Live preview of the first screen (or the prototype entry), top of the page, scaled into the card width (list.js does the same at 128 px).
  const THUMB = { width: 232, height: 145 };
  const preview = (t) => {
    const src = t.screens?.[0]?.file || t.prototype;
    if (!src) return `<span class="thumb"></span>`;
    const vp = t.viewport || { width: 1440, height: 900 };
    const scale = THUMB.width / vp.width;
    return `<span class="thumb"><iframe src="${t.base}${src}" width="${vp.width}" height="${Math.ceil(THUMB.height / scale)}" style="transform:scale(${scale})" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></span>`;
  };

  // Since the last visit: this browser remembers each topic's updated date on leaving the page, and marks on the next
  // visit the topics it has never seen (new) or whose date moved (updated). A first visit marks nothing.
  const store = {
    get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
  };
  const seen = store.get("protopass-home-seen");
  const change = (t) => (!seen ? "" : !(t.href in seen) ? "new" : seen[t.href] < (t.updated || "") ? "updated" : "");
  const mark = (t) => { const c = change(t); return c ? `<span class="change" data-change="${c}" data-tip="${c === "new" ? "New" : "Updated"} since your last visit"></span>` : ""; };
  addEventListener("pagehide", () => store.set("protopass-home-seen", Object.fromEntries(all.map((t) => [t.href, t.updated || ""]))));

  // Recent: a grid of the last topics touched, or a list of every topic sorted by date or name. The view is remembered.
  // With no topic at all, the sentence that makes the first one.
  const recentEl = document.getElementById("recent");
  let view = store.get("protopass-home-view") === "list" ? "list" : "grid";
  let sort = "date";
  const byName = (a, b) => (a.title || "").localeCompare(b.title || "");
  const tile = (t) => `
    <a class="recent__item" href="${t.href}">
      ${preview(t)}
      <span class="recent__head"><b>${mark(t)}${esc(t.title)}</b>${badge(t)}</span>
      <small>${[groups.length > 1 && esc(t.group.title), esc(t.updated)].filter(Boolean).join(" · ")}</small>
    </a>`;
  const row = (t) => `<a class="recent__row" href="${t.href}"><b>${mark(t)}${esc(t.title)}</b>${groups.length > 1 ? `<span class="chip">${esc(t.group.title)}</span>` : ""}<small>${esc(t.updated)}</small>${badge(t)}</a>`;
  const control = (attr, value, current, label, iconName) =>
    `<button type="button" class="btn" data-variant="${iconName ? "icon" : "ghost"}" data-${attr}="${value}" aria-pressed="${value === current}"${iconName ? ` data-tip="${label}" aria-label="${label}"` : ""}>${iconName ? icon(iconName) : label}</button>`;
  const renderRecent = () => {
    const list = view === "list";
    const items = list ? [...all].sort(sort === "name" ? byName : byDate) : groups.length > 1 ? all.slice(0, RECENT) : all;
    recentEl.innerHTML = `
      <div class="recent__bar">
        <h2>${list ? "All prototypes" : "Recent"} <small>${all.length} prototype${all.length === 1 ? "" : "s"}</small></h2>
        <span class="recent__controls">
          ${list ? `<span class="segment">${control("sort", "date", sort, "Date")}${control("sort", "name", sort, "Name")}</span>` : ""}
          <span class="segment">${control("view", "grid", view, "Grid of the latest prototypes", "squares-four")}${control("view", "list", view, "List of every prototype", "list")}</span>
        </span>
      </div>
      ${list ? `<div class="recent__rows">${items.map(row).join("")}</div>` : `<div class="recent__list">${items.map(tile).join("")}</div>`}`;
    window.renderIcons?.(recentEl);
  };
  recentEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view], [data-sort]");
    if (!btn) return;
    if (btn.dataset.view) { view = btn.dataset.view; store.set("protopass-home-view", view); }
    if (btn.dataset.sort) sort = btn.dataset.sort;
    renderRecent();
  });
  const ask = esc("Read AGENTS.md, then prototype: <describe your idea>");
  if (all.length) renderRecent();
  else recentEl.innerHTML = `<div class="empty">
        <div class="empty__art">${icon("sparkle")}</div>
        <h3 class="empty__title">No prototype yet</h3>
        <p class="empty__text">Paste this to your agent.</p>
        <p class="empty__ask"><code>${ask}</code></p>
        <div class="empty__actions"><button type="button" class="btn" data-variant="primary" data-copy="${ask}">${icon("copy")}Copy the sentence</button></div>
      </div>`;

  // Groups: the three latest topics of each, then the count and, when the statuses differ, one chip per status.
  const counts = (topics) => Object.entries(STATUS).map(([s, label]) => [label, topics.filter((t) => t.status === s).length]).filter(([, n]) => n);
  const card = (g) => {
    const status = counts(g.topics);
    return `
      <div class="card group">
        <div class="card__body">
          <h2><span class="group__icon">${icon(g.icon)}</span><a href="${g.base}">${esc(g.title)}</a><i class="icon group__arrow" data-icon="arrow-right"></i></h2>
          <p>${esc(g.text)}</p>
          ${g.topics.length
            ? `<ul class="group__topics">${g.topics.slice(0, LATEST).map((t) => `<li><a href="${t.href}"><span class="group__dot" data-status="${esc(t.status)}" data-tip="${STATUS[t.status] || esc(t.status)}"></span><span>${mark(t)}${esc(t.title)}</span><small>${esc(t.updated)}</small></a></li>`).join("")}</ul>`
            : `<p class="group__none">No prototype yet</p>`}
          <div class="group__meta"><span class="chip">${g.topics.length} prototype${g.topics.length === 1 ? "" : "s"}</span>${status.length > 1 ? status.map(([label, n]) => `<span class="chip">${n} ${label.toLowerCase()}</span>`).join("") : ""}</div>
        </div>
      </div>`;
  };
  // One group has no group to tell apart: the gallery above is the whole site.
  if (groups.length > 1) document.getElementById("groups").innerHTML = groups.map(card).join("");
  window.renderIcons?.();
  for (const name of ["updates.js", "live.js"]) document.head.append(Object.assign(document.createElement("script"), { src: new URL(name, KIT) }));
})();
