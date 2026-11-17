# Pricing

The plans of a product side by side, four at most, so they can be compared line by line. One offer alone is a `cta`.

```html
<div class="pricing">
  <article class="pricing__plan" data-variant="featured">
    <div class="pricing__head"><h3 class="pricing__name">Team</h3><span class="badge" data-variant="success">SAVE 20%</span></div>
    <p class="pricing__price"><span class="pricing__amount">$12</span><s>$15</s><span class="pricing__period">per seat, per month</span></p>
    <p class="pricing__plus">Everything in Free, plus</p>
    <ul class="pricing__list"><li><i class="icon" data-icon="check"></i>Unlimited loans</li></ul>
    <button class="btn" data-variant="primary" data-size="lg">Upgrade to Team</button>
  </article>
</div>
```

- The name is small, the amount large, the period under it. A discount shows the old price struck (`<s>`) after the amount and a `badge` in the head. `.pricing__plus` names the plan below, so each list only holds what is new. The action comes last and lines up across plans.
- `data-variant="featured"` rings one plan in ink: give it the only primary button. `aria-current="true"` is the plan the person has: it lies flat, and its button is `disabled` and says "Current plan".
- The plans share the row equally, and stack under 640 px. Needs `ds.js` for the checks.
