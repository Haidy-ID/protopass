# Button

32 px, 12 px medium text, 4 px radius. Default is outlined on the raised surface, primary is ink: black, white in dark (one per view), soft is filled grey without border (a quiet secondary next to a primary), ghost has no border, icon is a 32 px square for icon-only actions.

```html
<button class="btn"><i class="icon" data-icon="funnel"></i>Filters</button>
<button class="btn" data-variant="primary">Apply</button>
<button class="btn" data-variant="soft">Save draft</button>
<button class="btn" data-variant="ghost">Clear</button>
<button class="btn" data-variant="icon" aria-label="Close"><i class="icon" data-icon="x"></i></button>
<button class="btn" aria-pressed="true">High</button>
```

- Toggle or filter: `aria-pressed="true"` gives the accent tint. Use it instead of a clickable chip.
- Disabled: `disabled` on `<button>`, `aria-disabled="true"` on `<a>`.
- Icon-only buttons always carry `aria-label`.
- `data-size="lg"` (40 px, 13 px text) for a website's call to action. Tool screens keep 32 px. Buttons side by side share one size: put `lg` on each of them.
