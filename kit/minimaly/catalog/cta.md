# Call to action

A band that closes a page or a section with one thing to do: a heading, a line, the actions, all on the left edge. The opening of a page is a `hero`; a message about the state of things is a `banner`.

```html
<div class="cta" data-variant="inverted">
  <div class="cta__body">
    <h2 class="text" data-variant="heading">Ready when you are</h2>
    <p class="cta__text">Free for three people. No card, no setup call.</p>
  </div>
  <div class="cta__actions"><a class="btn" data-variant="primary" data-size="lg" href="signup.html">Start free</a><a class="btn" data-size="lg" href="contact.html">Talk to us</a></div>
</div>
```

- Variants: none (a sunken band) or `inverted` (ink, where the primary button flips and the default one becomes an outline).
- Inside a `section`, it takes the page width. Do not put an inverted band in an inverted section.
- One primary action, one more at most, both `data-size="lg"`. The line says what happens next, in one sentence.
