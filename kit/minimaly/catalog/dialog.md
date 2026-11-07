# Modal and drawer

A task that must be finished or dismissed before going back to the page: a modal centred, a drawer on the side for details. Native `<dialog>`. Needs `ds.js` for the opener, closer and backdrop.

```html
<button class="btn" data-open="rename">Rename…</button>

<dialog class="modal" id="rename" aria-labelledby="rename-title">
  <div class="dialog__head"><h2 class="dialog__title" id="rename-title">Rename project</h2>
    <button class="btn" data-variant="icon" data-close aria-label="Close"><i class="icon" data-icon="x"></i></button></div>
  <div class="dialog__body">…</div>
  <div class="dialog__foot"><button class="btn" data-close>Cancel</button><button class="btn" data-variant="primary">Rename</button></div>
</dialog>

<dialog class="drawer" id="details" aria-labelledby="details-title">…same three parts…</dialog>
```

- `data-open="<id>"` opens, or `dialog.showModal()` from script. `data-close` closes the dialog it sits in. Esc closes the top one. Focus goes back to the opener.
- The backdrop closes it only when the press starts and ends on the backdrop. `data-static` turns that off: use it for unsaved input, and for a choice the person must make, without the corner close button.
- Modal: 440 px wide at most, 78% of the screen high. The body scrolls, the head and the foot stay. Drawer: 320 px on the right, `data-side="left"` for the left, never wider than the screen minus 40 px.
- The page under it does not scroll while it is open.
- `autofocus` on the element focused at opening. In a destructive dialog, point it at the safe action.
