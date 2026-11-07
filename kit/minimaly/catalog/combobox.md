# Combobox

A search field whose results drop under it, each with an icon, a title and a detail line: an address, a client, a project. A short fixed list without search is a `select`. Needs `ds.js`.

```html
<div class="combobox">
  <label class="input"><i class="icon" data-icon="magnifying-glass"></i><input placeholder="Search an address" aria-label="Address"></label>
  <ul class="popover combobox__list">
    <li class="combobox__option" data-value="a-123"><i class="icon" data-icon="house"></i><span class="combobox__text"><span class="combobox__title">123 Main Street</span><span class="combobox__meta">Springfield, IL 62704, USA</span></span><i class="icon" data-icon="caret-right"></i></li>
    <li class="combobox__empty">No address matches.</li>
  </ul>
</div>
```

- Focus or typing opens the list; typing filters it on title and detail, and the first match is active (grey, chevron shown).
- ↑ ↓ move, Enter picks, Escape closes; a click picks. Picking writes the title in the field and fires `select` on the combobox (`event.detail.value`, `event.detail.option`).
- ds.js sets the combobox and listbox roles, `aria-expanded` and `aria-activedescendant`. Results from a server: the page replaces the options, then dispatches `input` on the field.
- The list opens under the field, inside the page flow's stacking: leave room below it.
