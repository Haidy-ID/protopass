# Tag input

Several short values typed into one field: labels, topics, email addresses. One value among a known list is a `select` or a `combobox`; a fixed set of filters is `.btn` with `aria-pressed`. Needs `ds.js`.

```html
<div class="tag-input"><span class="chip">design</span><span class="chip">research</span><input placeholder="Add a label" aria-label="Labels"></div>

<div class="combobox">
  <div class="tag-input"><input placeholder="Add a label" aria-label="Labels"></div>
  <ul class="popover combobox__list"><li class="combobox__option" data-value="Design"><i class="icon" data-icon="tag"></i><span class="combobox__text"><span class="combobox__title">Design</span></span></li><li class="combobox__empty">No label matches.</li></ul>
</div>
```

- Tags are `.chip` in the box, before the field; ds.js gives each a × (`Remove <tag>`). A chip's `data-value` is its value, else its text.
- Enter or a comma adds what is typed (a paste with commas adds each part). Backspace in the empty field removes the last tag; × removes one; a click anywhere in the box puts the caret in the field.
- A tag already there, in any case, is refused: that tag turns critical and shakes, the text stays in the field.
- In a `.combobox`, its list suggests tags: ↑ ↓ and Enter or a click add one; suggestions already added leave the list until their tag is removed.
- The root fires `change` with `event.detail.value`, the tag values. In a `field`, the label, hint and error link to the field; `data-invalid` tints and shakes the box. `disabled` on the text field fades the box and hides the ×.
