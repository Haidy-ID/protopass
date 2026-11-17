# Hero

The opening of a website page: what it is, for whom, and the first step. One per page, at the top of a `section`. A tool screen has no hero: its title goes in the `shell` top bar.

```html
<header class="hero">
  <div class="hero__body">
    <p class="text" data-variant="eyebrow">New · shared views</p>
    <h1 class="text" data-variant="display">Lend it, track it, get it back.</h1>
    <p class="text" data-variant="lead">Plan the week, lend what you own and see what comes back.</p>
    <div class="hero__actions"><a class="btn" data-variant="primary" data-size="lg" href="signup.html">Start free</a><a class="btn" data-size="lg" href="tour.html">See how it works</a></div>
  </div>
  <figure class="media"><div class="media__frame"><img src="…" alt="…"></div></figure>
</header>
```

- The eyebrow and the media are optional. Actions are `.btn` with `data-size="lg"`: one primary, one more at most.
- With a media, text and picture sit side by side from 960 px and stack under it. `data-variant="centered"` puts everything on the axis, the media under the text (`--ratio: 21 / 9` suits it).
- The text rises in when the page opens, the media just after. No texture, no decorative gradient: the picture is an `<img>` in the `media`.
