// Live reload on the local server: polls serve.mjs every second and reloads the page when one of its files changes.
// The page sends its path, so serve.mjs watches only that topic (or group, or home) with the kit and its design system.
// The viewer state lives in the URL (view, flow, screen, device), so a reload comes back to the same place.
// Another server has no /__protopass/revision route: the first failed poll stops it. A server that answered, then stops,
// is said on the page: polling goes on, and the page picks up again when the server comes back.
(() => {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) return;
  // The deliverable reader lives in kit/: the topic it reads is in its query.
  const page = new URLSearchParams(location.search).get("topic") ?? location.pathname;
  const url = `/__protopass/revision?page=${encodeURIComponent(page)}`;
  let seen = null;
  let alert = null;
  const lost = () => {
    if (alert) return;
    // No icon: icons come from the server that just stopped.
    alert = Object.assign(document.createElement("div"), { className: "banner page-alert", role: "status" });
    alert.dataset.variant = "warning";
    alert.innerHTML = '<div class="banner__body"><span class="banner__title">Local server stopped</span><span class="banner__text">This page no longer updates. Run node kit/serve.mjs again.</span></div>';
    document.body.append(alert);
  };
  const poll = async () => {
    const res = await fetch(url, { cache: "no-store" }).catch(() => null);
    const body = res?.ok ? await res.json().catch(() => null) : null;
    if (!body && seen === null) return;
    if (!body) lost();
    else {
      alert?.remove();
      alert = null;
      if (seen !== null && body.revision !== seen) return location.reload();
      seen = body.revision;
    }
    setTimeout(poll, 1000);
  };
  poll();
})();
