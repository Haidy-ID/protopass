# Menu

A list of actions on one thing, opened from a button or by right-click. To pick a value, use a `select`. Needs `ds.js`.

```html
<button class="btn" data-menu="row-actions"><i class="icon" data-icon="dots-three"></i>Actions</button>
<div class="card" data-context-menu="row-actions">…</div>
<div class="popover menu" id="row-actions" aria-label="Row 12 actions">
  <button class="menu__item"><i class="icon" data-icon="pencil-simple"></i>Rename<span class="kbd">R</span></button>
  <button class="menu__item" data-submenu="move-to"><i class="icon" data-icon="folder"></i>Move to<i class="icon menu__caret" data-icon="caret-right"></i></button>
  <hr class="menu__separator"><button class="menu__item" data-variant="critical"><i class="icon" data-icon="trash"></i>Delete</button>
</div>
<div class="popover menu" id="move-to" aria-label="Move to"><button class="menu__item">Inbox</button><button class="menu__item">Archive</button></div>
```

- `data-menu="<id>"` opens it below the button, above when there is no room. `data-context-menu="<id>"` opens it at the pointer on right-click, and at the surface with the menu key or Shift+F10.
- ↑ ↓ Home End move, disabled items are skipped. Esc and Tab close. Choosing an item closes the menu and puts focus back on the trigger; the page listens to the item's `click`.
- `data-submenu="<id>"` on an item opens that menu beside it, one level deep: on hover, on a click, or with → (focus goes in). ← and Esc close it and focus returns to the item; choosing the item itself keeps the menu open. A pointer travelling fast towards the submenu crosses the items in between without lighting them.
- `aria-label` names the thing the menu acts on. Shortcuts are a `.kbd` at the end of the row. Destructive items are `data-variant="critical"`, last, after a separator.
