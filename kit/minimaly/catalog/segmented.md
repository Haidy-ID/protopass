# Segmented

One toggle between 2 to 4 exclusive options, all visible: a mode, a device size. The pressed option is raised.

```html
<span class="segmented" role="group" aria-label="Mode">
  <button class="btn" aria-pressed="true"><i class="icon" data-icon="frame-corners"></i>Canvas</button>
  <button class="btn" aria-pressed="false"><i class="icon" data-icon="play"></i>Prototype</button>
</span>
```

- Exactly one `.btn` has `aria-pressed="true"`; the page updates it on click.
- Needs `ds.js`: the raised look is one indicator that slides to the pressed option. Without it, no option looks pressed.
- A count after a label: `<span class="btn__count">12</span>`.
- Icon-only options (`data-variant="icon"`) carry `aria-label` and a `data-tip`.
- More than 4 options, or a choice that is not visible at once: use a `select`.
