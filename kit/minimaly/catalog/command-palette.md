# Command palette

Every place and action of an app behind one shortcut: ⌘K or Ctrl+K, type, Enter. Or, with `data-select="multiple"`, pick several things into a cart, then say what to do with them. One per page and purpose. Picking a value for a field is a `combobox`; actions on one thing are a `menu`. Needs `ds.js`.

```html
<dialog class="modal command-palette" aria-label="Commands">
  <label class="input command-palette__search"><i class="icon" data-icon="magnifying-glass"></i><input placeholder="Search commands" aria-label="Search commands"></label>
  <div class="command-palette__list">
    <div class="command-palette__group"><p class="command-palette__label">Go to</p>
      <div class="command-palette__item" data-value="inbox"><i class="icon" data-icon="tray"></i><span class="command-palette__title">Inbox</span><span class="command-palette__keys"><span class="kbd">G</span><span class="kbd">I</span></span></div>
    </div>
    <div class="empty command-palette__empty" data-variant="compact"><span class="empty__art"><i class="icon" data-icon="magnifying-glass"></i></span><p class="empty__title">No command found</p><p class="empty__text">Try another word.</p></div>
  </div>
</dialog>
```

- ⌘K or Ctrl+K opens and closes it from anywhere; `data-open="<id>"` on a button too (the dialog card). Esc or the backdrop close it, focus goes back.
- Typing filters on the titles; groups left empty hide, the empty state shows when nothing matches. The first match is active (grey). It hangs from the top of the screen, so the field never moves while results filter.
- ↑ ↓ move, Enter or a click runs the active item: the palette closes, then fires `select` on it (`event.detail.value`, `event.detail.item`). Closing clears the search. Shortcuts are `.kbd` keys in `.command-palette__keys`.

## Pick, cart, intent

`data-select="multiple"`, usually with `data-variant="sheet"` (docked at the bottom, fixed height so tiles never move under the thumb) opened by a `button.command-palette__trigger` bar. See the specimen for the full markup.

- A press or Enter adds one to the item's `data-count`; the page may write `data-count` too (an options panel). The tile shows the count; the cart survives closing.
- Spaces: a `.tabs` after the search, one `.tabs__panel` per space inside `__list`. A search looks through every space.
- Tiles: `data-layout="grid"` on a group, a `.command-palette__art` (illustration or icon) before the title.
- After the list, a `.command-palette__foot hidden` holding `.command-palette__cart` (pills − quantity name +, labels from `data-less` / `data-more`), `.command-palette__summary` (`data-one`, `data-other`, `#` is the count) and `.command-palette__intents` of `button.btn.command-palette__intent[data-value]` (`data-variant="soft"`).
- The intents show from the first pick, two per row. `data-intent` on the opener, else on the palette, or a single intent leaves only that one, as one big ink action.
- An intent closes, fires `confirm` (`detail.intent`, `detail.items`: `value`, `title`, `quantity`, `item`) and empties the cart. A pill's name fires `options` on the item.
