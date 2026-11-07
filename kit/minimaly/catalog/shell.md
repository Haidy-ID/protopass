# App shell

The frame of an app screen: navigation rail on the left, top bar, scrolling content. Needs `ds.js` to fold the rail.

```html
<div class="shell">
  <nav class="shell__nav" aria-label="Main">
    <div class="shell__brand"><span class="avatar">A</span><span class="shell__brand-name">Atlas</span></div>
    <a class="nav__item" href="home.html" aria-current="page"><i class="icon" data-icon="house"></i><span class="nav__label">Home</span></a>
    <a class="nav__item" href="inbox.html"><i class="icon" data-icon="tray"></i><span class="nav__label">Inbox</span><span class="nav__count">3</span></a>
    <p class="nav__section">Projects</p>
    <a class="nav__item shell__foot" href="settings.html"><i class="icon" data-icon="gear"></i><span class="nav__label">Settings</span></a>
  </nav>
  <header class="shell__top"><button class="btn" data-variant="icon" data-shell-toggle aria-expanded="true" aria-label="Toggle navigation"><i class="icon" data-icon="sidebar-simple"></i></button><h1 class="shell__title">Home</h1></header>
  <main class="shell__main">…</main>
</div>
```

- `data-collapsed` on `.shell` folds the rail to icons; `[data-shell-toggle]` toggles it. Labels, counts and sections fade, the rail springs to its width.
- Fills the viewport (100dvh). For desktop and tablet screens; a phone screen has no rail.
- A right pane: `<section class="pane shell__aside" aria-label="Preview">` after `.shell__main`. It sits under the top bar, `--shell-aside` sets its width (480 px), `hidden` closes its column.
