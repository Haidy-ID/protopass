// Small Markdown renderer for the topic journal and the Markdown deliverables (stories, studies). No dependency.
// Headings, paragraphs, lists, quotes, code, bold, italic, links and figures ("![caption](file.png|file.html)" on its own line;
// an .html figure, such as an animated illustration, plays in a frame). "> Gap: …" renders as a gap callout:
// a moment the story tells that no screen shows yet. Links go through options.link(href), which returns a URL or null.
window.renderMarkdown = (text, { link = (href) => href } = {}) => {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Only web, relative and resolver-made links: javascript: and other schemes stay plain text.
  const safe = (href) => {
    const url = link(href);
    return url && !/^[a-z][\w+.-]*:/i.test(url.replace(/^https?:/i, "")) ? url : null;
  };
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
      const url = safe(href.replace(/&amp;/g, "&"));
      return url ? `<a href="${esc(url)}"${/^https?:/i.test(url) ? ' target="_blank"' : ""}>${label}</a>` : label;
    });

  const out = [];
  let list = null, para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) flush();
    else if ((m = line.match(/^(#{1,4})\s+(.*)/))) { flush(); const n = Math.min(m[1].length + 1, 5); out.push(`<h${n}>${inline(m[2])}</h${n}>`); }
    else if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
      // A figure on its own line: an image, or an HTML figure (an animated illustration) in a frame. No sandbox: figures are
      // files of the project, like the screens, and some browsers block sandboxed (opaque-origin) frames outright.
      flush();
      const url = safe(m[2]);
      const caption = m[1] ? `<figcaption>${inline(m[1])}</figcaption>` : "";
      if (url) out.push(`<figure class="md-figure">${/\.html?(\?|#|$)/i.test(m[2]) ? `<iframe src="${esc(url)}" title="${esc(m[1] || "Figure")}" loading="lazy"></iframe>` : `<img src="${esc(url)}" alt="${esc(m[1])}" loading="lazy">`}${caption}</figure>`);
    }
    else if ((m = line.match(/^>\s*Gap:\s*(.*)/i))) { flush(); out.push(`<p class="md-gap"><span class="badge" data-variant="warning">Gap</span>${inline(m[1])}</p>`); }
    else if ((m = line.match(/^>\s?(.*)/))) { flush(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); }
    else if ((m = line.match(/^\s*([-*]|\d+\.)\s+(.*)/))) {
      const tag = /\d/.test(m[1]) ? "ol" : "ul";
      if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; }
      if (list !== tag) { if (list) out.push(`</${list}>`); out.push(`<${tag}>`); list = tag; }
      out.push(`<li>${inline(m[2])}</li>`);
    } else {
      if (list) { out.push(`</${list}>`); list = null; }
      para.push(line.trim());
    }
  }
  flush();
  return out.join("\n");
};
