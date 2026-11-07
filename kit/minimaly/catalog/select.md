# Select

Native `<select>` in a 32 px box, caret-down icon on the right. `ds.js` opens its list as a Minimaly menu (`.select__menu`, check on the chosen option) instead of the browser's; the select keeps the value and still fires `change`. The inline label names the choice when there is no label above.

```html
<label class="select"><select><option>All priorities</option><option>High</option></select><i class="icon select__icon" data-icon="caret-down"></i></label>
<label class="select"><span class="select__label">Group by</span><select><option>Application</option><option>Team</option></select><i class="icon select__icon" data-icon="caret-down"></i></label>
```

- One choice among several options, such as a view setting (group by, show). The inline label stays visible, so the current choice reads as "Group by Team".
