# Field

A label, its control, an optional hint, a warning and an error. Wraps `.input`, `.select` or `.textarea` (each keeps its own `<label>` box, so a click anywhere in it focuses the field), or a group of checkboxes or radios. Needs `ds.js`.

```html
<div class="field">
  <label class="field__label">Project name <span class="field__required" aria-hidden="true">*</span></label>
  <label class="input"><input required></label>
  <p class="field__hint">Shown on the home page.</p>
  <p class="field__warning"><i class="icon" data-icon="warning"></i>Another project has this name.</p>
  <p class="field__error"><i class="icon" data-icon="warning-circle"></i>A name is required.</p>
</div>
```

- `data-invalid` on `.field` shows the error in place of the hint, tints the control and shakes it once. ds.js sets `aria-invalid` and links the label (`for`).
- `data-warning` shows the warning in place of the hint: a remark that does not block (a duplicate, an unusual value). No shake, and the error wins when both are set.
- The control is described (`aria-describedby`) by the one note on screen: the error, else the warning, else the hint.
- Optional field: `<span class="field__optional">Optional</span>` in the label instead of the star. A disabled control dims the whole field.
- Choices: `<div class="field" role="group" aria-labelledby="…">`, a `<span class="field__label" id="…">`, then `.field__choices` (column) or `.field__choices[data-variant="row"]`.
