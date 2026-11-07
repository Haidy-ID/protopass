# Textarea

Multi-line text. Grows with its content up to 280 px, then scrolls (`field-sizing: content`). Needs `ds.js` for the counter.

```html
<label class="textarea"><textarea placeholder="What changed?" aria-label="Note"></textarea></label>
<label class="textarea" data-max="280"><textarea aria-label="Note"></textarea></label>
```

- `data-max` caps the length and shows "used / max" under the text; the counter turns critical once full.
- `data-variant="filled"`: a sunken field for writing inside a raised card; it rises to the raised surface while focused.
- In a `field`, the field label names it: drop the `aria-label`.
