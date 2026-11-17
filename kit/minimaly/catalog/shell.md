# App shell

The frame of an app screen: navigation rail on the left, top bar, scrolling content. Needs `ds.js` to fold the rail.

```html
<div class="shell">
  <nav class="shell__nav" aria-label="Main"><div class="shell__brand"><span class="avatar">A</span><span class="shell__brand-name">Atlas</span></div>
    <a class="nav__item" href="home.html" aria-current="page"><i class="icon" data-icon="house"></i><span class="nav__label">Home</span><span class="nav__count">3</span></a>
    <details class="nav__group" open><summary class="nav__item"><i class="icon" data-icon="folder"></i><span class="nav__label">Projects</span><i class="icon nav__caret" data-icon="caret-right"></i></summary><div class="nav__sub"><a class="nav__item" href="lending.html"><span class="nav__label">Lending</span></a></div></details>
    <div class="nav__card"><div class="nav__card-head"><span class="badge" data-variant="accent">NEW</span><button class="btn" data-variant="icon" data-dismiss aria-label="Dismiss"><i class="icon" data-icon="x"></i></button></div><p class="nav__card-title">Shared views</p><p class="nav__card-text">Save a filter and share it.</p><button class="btn">Try it</button></div>
    <button class="shell__account shell__foot" data-menu="account"><span class="avatar" aria-hidden="true">SA</span><span class="shell__account-text"><span class="shell__account-name">Sam Adler</span><span class="shell__account-meta">sam@atlas.app</span></span><i class="icon" data-icon="caret-up-down"></i></button></nav>
  <header class="shell__top"><button class="btn" data-variant="icon" data-shell-toggle aria-expanded="true" aria-label="Toggle navigation"><i class="icon" data-icon="sidebar-simple"></i></button><h1 class="shell__title">Home</h1></header><main class="shell__main">…</main>
</div>
```

- `data-collapsed` on `.shell` folds the rail to icons; `[data-shell-toggle]` toggles it. Labels, counts and sections (`<p class="nav__section">`) fade, the rail springs to its width. Fills the viewport (100dvh); a phone screen has no rail.
- `.nav__group`: links nested in a native `<details>`, the caret turns, the links unfold. A closed or folded group lights up when it holds the current page; choosing a group in a folded rail unfolds it. The rail scrolls when open groups outgrow it.
- `.shell__account` opens a `menu` (settings, billing, sign out) through `data-menu`: the avatar alone when folded. A plain foot link is `<a class="nav__item shell__foot">`. `.nav__card`: one piece of news above the foot, hidden when folded; `[data-dismiss]` removes it and fires `dismiss` on the rail.
- A right pane: `<section class="pane shell__aside" aria-label="Preview">` after `.shell__main`. It sits under the top bar, `--shell-aside` sets its width (480 px), `hidden` closes its column.
