# Facts

What a panel says about the one thing it shows (an inspector, a detail card): a label, then its value, row after row. Many things to compare: a `table`. Values to change: `field`s.

```html
<dl class="facts">
  <div class="facts__row"><dt class="facts__label">Owner</dt><dd class="facts__value">Sam Adler</dd></div>
  <div class="facts__row"><dt class="facts__label">Linked</dt><dd class="facts__value"><button class="btn"><span class="badge">E1</span>Fear</button></dd></div>
  <div class="facts__row"><dt class="facts__label">Due</dt><dd class="facts__value" data-variant="muted">No date</dd></div>
</dl>
```

- A value holds text, a plain `ul`, badges or buttons, and wraps: it is never cut.
- `data-variant="muted"`: a value left unset (tertiary text).
- No surface of its own: put it in a `card__body` or a `pane__body`.
