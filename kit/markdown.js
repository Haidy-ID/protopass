// Small Markdown renderer for the topic journal and the Markdown deliverables (stories, studies, specs). No dependency.
// Headings, paragraphs, lists, quotes, code, bold, italic, links, tables ("| a | b |" rows under a "|---|---:|" line) and
// figures ("![caption](file.png|file.html)" on its own line; an .html figure, such as an animated illustration, plays in a frame).
// "![caption](screen:<id>:<state>)" on its own line embeds that screen at its real size; lines that follow each other sit side by side.
// "> Gap: …" renders as a gap callout: a moment the story tells that no screen shows yet.
// Links go through options.link(href), which returns a URL or null. Screens go through options.screen(ref), which returns
// { src, width, height, href, label } or null; without it, an embedded screen is a link.
window.renderMarkdown = (text, { link = (href) => href, screen = null } = {}) => {
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
  // "| a | b |" → ["a", "b"]. A pipe written "\|" stays in its cell.
  const cells = (line) => line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
  const isRule = (line) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line) && line.includes("-");

  const out = [];
  let list = null, para = [], row = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
    if (list) out.push(`</${list}>`);
    list = null;
    if (row.length) out.push(`<div class="md-screens">${row.join("")}</div>`);
    row = [];
  };
  const lines = text.replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    let m;
    // Screens that follow each other share a row: anything else ends it.
    if (row.length && !/^!\[[^\]]*\]\(screen:[^)\s]+\)$/.test(line)) flush();
    if (!line.trim()) flush();
    else if ((m = line.match(/^(#{1,4})\s+(.*)/))) { flush(); const n = Math.min(m[1].length + 1, 5); out.push(`<h${n}>${inline(m[2])}</h${n}>`); }
    else if ((m = line.match(/^!\[([^\]]*)\]\(screen:([^)\s]+)\)$/))) {
      // A screen of the topic, live in a frame of its design size. The reader scales the frame down when the column is narrower.
      if (para.length || list) flush();
      const s = screen?.(m[2]);
      const url = !screen && safe(`screen:${m[2]}`);
      if (s) {
        const label = m[1] ? inline(m[1]) : esc(s.label);
        row.push(`<figure class="md-figure md-screen" style="--screen-w:${Number(s.width)};--screen-h:${Number(s.height)}"><div class="md-screen__frame"><iframe src="${esc(s.src)}" title="${esc(m[1] || s.label)}" loading="lazy"></iframe></div><figcaption>${s.href ? `<a href="${esc(s.href)}">${label}</a>` : label}</figcaption></figure>`);
      } else {
        flush();
        if (url) out.push(`<p><a href="${esc(url)}">${inline(m[1] || m[2])}</a></p>`);
        else out.push(`<p class="md-gap"><span class="badge" data-variant="critical">Missing</span>No screen <code>${esc(m[2])}</code> in this topic.</p>`);
      }
    }
    else if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
      // A figure on its own line: an image, or an HTML figure (an animated illustration) in a frame. No sandbox: figures are
      // files of the project, like the screens, and some browsers block sandboxed (opaque-origin) frames outright.
      flush();
      const url = safe(m[2]);
      const caption = m[1] ? `<figcaption>${inline(m[1])}</figcaption>` : "";
      if (url) out.push(`<figure class="md-figure">${/\.html?(\?|#|$)/i.test(m[2]) ? `<iframe src="${esc(url)}" title="${esc(m[1] || "Figure")}" loading="lazy"></iframe>` : `<img src="${esc(url)}" alt="${esc(m[1])}" loading="lazy">`}${caption}</figure>`);
    }
    else if (/^\s*\|/.test(line) && isRule(lines[i + 1] || "")) {
      // A table: a header row, a rule that sets the alignment of each column (":--", ":-:", "--:"), then the rows.
      flush();
      const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-:$/.test(c) ? "right" : ""));
      const tr = (tag, cols) => `<tr>${cols.map((c, k) => `<${tag}${align[k] ? ` data-align="${align[k]}"` : ""}>${inline(c)}</${tag}>`).join("")}</tr>`;
      const body = [];
      let j = i + 2;
      for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) body.push(tr("td", cells(lines[j])));
      out.push(`<div class="md-table"><table><thead>${tr("th", cells(line))}</thead><tbody>${body.join("")}</tbody></table></div>`);
      i = j - 1;
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
