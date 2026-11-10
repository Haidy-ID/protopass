# Reading progress

How far a reader is through a long text: a thin line that fills as the text is read. For an article or a case study. A task with a measurable end (an upload, an export) is a `progress`. Needs `ds.js`.

```html
<header class="sticky-header">
  …
  <div class="reading-progress" data-for="text" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="reading-progress__fill"></span></div>
</header>
<article class="prose" id="text">…</article>
```

- `data-for`: the id of the text to follow. The reading line sits 40% down the window: the text counts as read once it has passed it.
- Inside a `sticky-header` it runs along its bottom edge. Anywhere else it is a line as wide as its container.
- It fires `change` with `detail.read`, from 0 to 1, for what the page adds: `bar.addEventListener("change", (e) => { left.textContent = minutesLeft(e.detail.read); })`.
- It follows the scroll itself: no transition, nothing to stop under reduced motion.
- Static markup without script: `style="--read: 0.4"`.
- Not focusable: it reports, it does not act.
