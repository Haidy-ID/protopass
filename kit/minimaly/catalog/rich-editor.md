# Rich editor

Formatted notes, comments or descriptions: bold, italic, underline, lists, links. Plain text without formatting: use a `textarea`. Needs `ds.js`, which builds the toolbar, the area and the foot.

```html
<div class="rich-editor" data-placeholder="Write guideline notes…" data-hint="Markdown shortcuts supported" data-max="2000" aria-label="Guideline notes"></div>
```

- Content already inside the root becomes the starting text (`<div>`, `<b>`, `<i>`, `<u>`, `<ul>`, `<ol>`, `<a>`).
- `data-max` caps typed and pasted characters (line breaks not counted) and shows "used / max"; the counter turns critical once full. Paste keeps the text, drops the source formatting.
- In a `field`, the field label names it (drop `aria-label`); `data-invalid` on the field tints and shakes the box. `aria-disabled="true"` on the root disables it.
- Keys: ⌘/Ctrl + B, I, U, K (link), Z, ⇧Z. Toolbar is one Tab stop, ← → Home End move along it. Typing `- ` or `* ` at the start of a line starts a bulleted list, `1. ` a numbered one.
- The link button opens a popover: Enter applies, Esc cancels, Remove unlinks. Addresses without a scheme get `https://`.
- Toolbar buttons show pressed (`aria-pressed`) for the formats under the caret.
- The root fires `input` and `change` (on leaving the editor) with `detail: { html, text }`.
- Formatting runs on `document.execCommand`: deprecated, still in every browser, and the only dependency-free way to keep native undo. Fine for prototypes, not for production.
