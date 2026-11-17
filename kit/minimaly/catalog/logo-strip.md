# Logo strip

Who uses or backs the product: a label, then a row of logos. Quiet on purpose, it supports the `hero` above it. What people say goes in a `quote`.

```html
<div class="logo-strip">
  <p class="logo-strip__label">Trusted by teams at</p>
  <ul class="logo-strip__logos">
    <li><img src="hexa.svg" alt="Hexa"></li>
    <li><img src="orbit-mark.svg" alt="">Orbit</li>
  </ul>
</div>
```

- A logo is an `<img>` 24 px high, alone (name in `alt`) or as a mark followed by the name in text (`alt=""`).
- Supply dark, single-color files: the strip greys them, and turns them light on the dark theme.
- The row wraps on a narrow screen. Nothing scrolls or moves on a timer. `data-variant="centered"` under a centered hero.
- Five to seven logos. Not clickable.
