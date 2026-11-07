# Carousel

A row of cards that scrolls sideways: articles, projects, versions. More items than fit, all of the same kind. Needs `ds.js` for the arrows.

```html
<span class="carousel__controls">
  <button class="btn" data-variant="icon" data-carousel="prev" aria-controls="posts" aria-label="Previous articles"><i class="icon" data-icon="arrow-left"></i></button>
  <button class="btn" data-variant="icon" data-carousel="next" aria-controls="posts" aria-label="Next articles"><i class="icon" data-icon="arrow-right"></i></button>
</span>
<ul class="carousel" id="posts" aria-label="Latest writing" style="--carousel-item: 320px">
  <li><a class="card" href="…">…</a></li>
</ul>
```

- `--carousel-item` sets the card width (320 px), at most 85% of the row on a phone so the next card peeks. Cards snap to the start.
- The arrows scroll one card and turn disabled at either end; they can sit anywhere, linked by `aria-controls`. Trackpad, swipe and arrow keys (once the row has focus) scroll it natively.
- ds.js numbers the slides for screen readers ("2 of 6"). No autoplay.
