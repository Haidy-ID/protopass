# Menu

A list of actions on one thing, opened from a button or by right-click. To pick a value, use a `select`. Needs `ds.js`.

```html
<button class="btn" data-menu="row-actions"><i class="icon" data-icon="dots-three"></i>Actions</button>
<div class="card" data-context-menu="row-actions">…</div>

<div class="popover menu" id="row-actions" aria-label="Row 12 actions">
  <button class="menu__item"><i class="icon" data-icon="pencil-simple"></i>Rename<span class="kbd">R</span></button>
  <hr class="menu__separator">
  <button class="menu__item" data-variant="critical"><i class="icon" data-icon="trash"></i>Delete</button>
</div>
```

- `data-menu="<id>"` opens it below the button, above when there is no room. `data-context-menu="<id>"` opens it at the pointer on right-click, and at the surface with the menu key or Shift+F10.
- ↑ ↓ Home End move, disabled items are skipped. Esc and Tab close. Choosing an item closes the menu and puts focus back on the trigger; the page listens to the item's `click`.
- `aria-label` names the thing the menu acts on, so a screen reader knows which of twenty menus opened.
- Shortcuts are a `.kbd` at the end of the row. Destructive items are `data-variant="critical"`, last, after a separator.
