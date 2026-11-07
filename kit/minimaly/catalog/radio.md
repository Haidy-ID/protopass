# Radio

One choice among a few, all visible. Native input in its label; inputs of a group share a `name`. Arrow keys move within the group.

```html
<div class="field" role="radiogroup" aria-labelledby="plan">
  <span class="field__label" id="plan">Plan</span>
  <div class="field__choices" data-variant="row">
    <label class="radio"><input type="radio" name="plan" checked><span class="radio__dot"></span>Monthly</label>
    <label class="radio"><input type="radio" name="plan"><span class="radio__dot"></span>Yearly</label>
  </div>
</div>
```

- The dot grows from the ring with a bounce.
- More than five choices: a `select`.
