// Screen state from the URL (?state=loading) so the topic page can show every state of a screen.
const state = new URLSearchParams(location.search).get("state") || "default";
document.documentElement.dataset.state = state;
// Optional per-state text: <span data-when="loading">Saving…</span> is shown only in that state.
document.querySelectorAll("[data-when]").forEach((el) => { el.hidden = el.dataset.when !== state; });
