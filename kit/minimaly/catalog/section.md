# Section

One band of a website page. The band runs from edge to edge, its content stays within the page width (1120 px) and its blocks follow each other on one rhythm. An app screen uses `shell` instead.

```html
<section class="section" data-variant="sunken">
  <div class="section__head">
    <p class="text" data-variant="eyebrow">How</p>
    <h2 class="text" data-variant="heading">One place for what you lend</h2>
    <p class="text" data-variant="lead">Every block of a section follows the last on one rhythm.</p>
  </div>
  <div class="feature-tabs">…</div>
</section>
```

- 96 px above and below, 48 px between its blocks (64 and 32 under 640 px), 24 px at the sides on a narrow screen. `.section__head` groups an eyebrow, a heading and a lead.
- Variants: none (the page surface), `sunken` (a band set below the page, to separate two sections without a line), `inverted` (ink: one per page, for the closing call).
- On `inverted`, `text`, and `.btn` in primary, default and ghost adapt. Keep cards, tables and fields out of it.
- Put sections directly one after the other in `<main>`: no margin between them. The page ends with a `site-footer`.
