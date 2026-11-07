# Input

Text field in a 32 px box. The `<label>` wraps the field so a click anywhere focuses it. Optional leading icon, a magnifying glass for search.

```html
<label class="input"><input placeholder="Project name"></label>
<label class="input"><i class="icon" data-icon="magnifying-glass"></i><input type="search" placeholder="Search topics" aria-label="Search topics"></label>
```

- Width from the layout (`flex: 1` or a fixed width on `.input`).
- A field without a visible label carries `aria-label`.
- Add-ons sit flush inside the box: `<span class="input__addon">$</span>` before or after the field for a unit or currency, a trailing `.btn` (default or primary) for an action on the value, `.input__stepper` with two `data-step="up|down"` buttons for a number.

```html
<label class="input"><span class="input__addon">$</span><input inputmode="decimal" aria-label="Amount"><span class="input__addon">USD</span></label>
<label class="input"><input placeholder="Code" aria-label="Promo code"><button class="btn" type="button">Apply</button></label>
<label class="input"><input type="number" min="0" aria-label="Guests"><span class="input__stepper"><button type="button" data-step="up" tabindex="-1" aria-hidden="true"><i class="icon" data-icon="caret-up"></i></button><button type="button" data-step="down" tabindex="-1" aria-hidden="true"><i class="icon" data-icon="caret-down"></i></button></span></label>
```

- The stepper needs `ds.js`, respects `min`, `max` and `step`, and fires `input` and `change`. Its arrows stay out of the Tab order: ↑ ↓ on the field do the same.
