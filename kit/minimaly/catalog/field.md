# Field

A label, its control, an optional hint and an error. Wraps `.input`, `.select` or `.textarea` (each keeps its own `<label>` box, so a click anywhere in it focuses the field), or a group of checkboxes or radios. Needs `ds.js`.

```html
<div class="field">
  <label class="field__label">Project name <span class="field__required" aria-hidden="true">*</span></label>
  <label class="input"><input required></label>
  <p class="field__hint">Shown on the home page.</p>
  <p class="field__error"><i class="icon" data-icon="warning-circle"></i>A name is required.</p>
</div>
```

- `data-invalid` on `.field` shows the error in place of the hint, tints the control and shakes it once. ds.js sets `aria-invalid`, links the label (`for`) and the hint and error (`aria-describedby`).
- Optional field: `<span class="field__optional">Optional</span>` in the label instead of the star.
- Choices: `<div class="field" role="group" aria-labelledby="…">`, a `<span class="field__label" id="…">`, then `.field__choices` (column) or `.field__choices[data-variant="row"]`.
- A disabled control dims the whole field.
