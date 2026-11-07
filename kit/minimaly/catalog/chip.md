# Chip

Tag for a value or an entity (project, version, attached file). 22 px, not clickable.

```html
<span class="chip"><i class="icon" data-icon="folder"></i>Atlas</span>
<span class="chip" data-variant="round">v2.1</span>
<span class="chip" data-variant="accent"><i class="icon" data-icon="paperclip"></i>brief.pdf</span>
```

- Variants: none (square, sunken), `round` (pill), `accent` (linked or new).
- Icon is 12 px automatically.
- Need a click target: use a `.btn`, not a chip.
