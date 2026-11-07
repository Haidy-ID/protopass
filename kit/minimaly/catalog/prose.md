# Prose

Long-form reading: an article, a case study, documentation. 18 px text on a 1.7 line, one measure (680 px) wide. Headings, lists, links and inline code inside are styled; `code` and `quote` blocks fit in.

```html
<article class="prose">
  <section><h2>Offline first</h2><p>Every write lands on the device first, then <a href="…">syncs</a>.</p><ul><li>…</li></ul></section>
</article>
```

- Sections are spaced 48 px apart, blocks inside 16 px. Only plain lists and links (no class) take the prose look.
- 16 px text under 640 px. Pair with a `toc` on the side for long pages.
