# Button group

Two or three buttons that act on the same thing, joined into one control: the main action with its text, then its alternates, often icon only (download and copy, save and more).

```html
<span class="btn-group" role="group" aria-label="Export the notes">
  <button class="btn"><i class="icon" data-icon="download-simple"></i>Download</button>
  <button class="btn" data-variant="icon" data-copy="…" aria-label="Copy the notes"><i class="icon" data-icon="copy"></i></button>
</span>
```

- Every half is a `.btn` (`<button>` or `<a>`) with its own states: hover, `aria-pressed`, `disabled`, and the labels of an `async-button`. Tab stops on each one.
- The variant sits on the group, not on the halves: none (outlined) or `data-variant="primary"` (ink, one per view). A half only says `data-variant="icon"` when it is icon only, and then carries `aria-label`.
- `role="group"` and an `aria-label` that names what the buttons act on.
- `data-size="lg"` goes on every half.
- One choice among exclusive options: a `segmented`. Actions on different things: separate buttons, with a gap. More than three: a `menu` behind the last half.
