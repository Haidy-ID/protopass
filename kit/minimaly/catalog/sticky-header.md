# Sticky header

The bar of a long page: it stays on top while the content scrolls under it. Needs `ds.js` for the stuck look.

```html
<header class="sticky-header">
  <button class="btn" data-variant="icon" aria-label="Back"><i class="icon" data-icon="arrow-left"></i></button>
  <div class="sticky-header__titles"><h1 class="sticky-header__title">Quarterly report</h1><span class="sticky-header__subtitle">Edited 2 hours ago</span></div>
  <button class="btn">Share</button>
</header>
```

- 56 px high, always. Once content passes under it, `data-stuck` adds a hairline and a soft shadow and fades the subtitle out.
- Its height never changes, so the content below never jumps.
- With a `toc` on the same page, set the toc's `data-spy-offset` to 56 plus any gap.
