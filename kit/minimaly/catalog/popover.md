# Popover

Floating panel for a filter or a small menu, 300 px. The page positions it.

```html
<div class="popover">
  <p class="popover__label">Priority</p>
  <div><button class="btn" aria-pressed="true">High</button> <button class="btn">Medium</button></div>
  <div class="popover__foot"><button class="btn" data-variant="ghost">Clear</button><button class="btn" data-variant="primary">Apply</button></div>
</div>
```

- Options are `.btn` with `aria-pressed`, so each one stays a 32 px target.
- Hide with the `hidden` attribute.
