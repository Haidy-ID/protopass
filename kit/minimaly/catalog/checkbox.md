# Checkbox

An option that is on or off, in a list of independent options. Native input in its label: the whole row toggles, Space works. Needs `ds.js` (draws the check).

```html
<label class="checkbox"><input type="checkbox"><span class="checkbox__box"></span>Remember me</label>
<label class="checkbox"><input type="checkbox"><span class="checkbox__box"></span><span class="checkbox__text">Weekly digest<small>Every Monday, 9 am</small></span></label>
```

- The check draws along its path when checked and erases when unchecked. `input.indeterminate = true` shows a dash (a parent with some children checked).
- One choice among several: `radio`. An immediate on/off setting: `switch`.
- Disabled: `disabled` on the input.
