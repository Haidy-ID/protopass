# Inline edit

A text renamed where it stands: a title, a row name, a label. Several values to change at once, or a value that needs checking: a form with `field`. Needs `ds.js`.

```html
<span class="inline-edit">
  <span class="inline-edit__text">Quarterly report</span>
  <button class="inline-edit__btn" aria-label="Rename Quarterly report"><i class="icon" data-icon="pencil-simple"></i></button>
</span>
```

- The pencil shows on hover and on focus (always on a touch screen). It starts the edit; so do Enter or F2 when the text has the focus. No double-click: it belongs to the row that opens.
- The text itself becomes the field, with the same type and size: nothing moves. Put the class on the element that carries the type (`<h2 class="inline-edit">`).
- Enter saves, Esc restores, leaving the field saves. An emptied text is restored.
- A save that changed the text fires `change` on `.inline-edit` (`event.detail`: `value`, `previous`) and is announced. Storing it is the page's job: show how it goes with a `save-status`.
- One tab stop, the text; the pencil's `aria-label` describes it.
