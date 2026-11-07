# Pane

A side panel: a head (title, a badge, actions) and a body that scrolls on its own. In an app, put it right of the content with `.shell__aside` (see `shell`).

```html
<section class="pane" aria-label="Changes">
  <div class="pane__head"><h2 class="pane__title">Changes</h2><button class="btn" data-variant="icon" aria-label="Close"><i class="icon" data-icon="x"></i></button></div>
  <div class="pane__body">…</div>
</section>
```

- Head 56 px, like the shell top bar, so both line up. The title truncates with an ellipsis.
- `aria-label` names what the pane shows. A pane that floats over the page is a `drawer`, not a pane.
