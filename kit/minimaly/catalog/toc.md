# Table of contents

The sections of a long page, with the one being read marked. Needs `ds.js` for the scroll spy.

```html
<nav class="toc" data-spy aria-label="On this page">
  <a href="#goals">Goals</a>
  <a href="#plan">Plan</a>
</nav>
```

- `data-spy`: the link of the section crossing the reading line carries `aria-current="location"`. At the very bottom of the page, the last section wins however short.
- The reading line is 96 px from the top. Set `data-spy-offset` to the height of a sticky header above the content.
- Each link points to a section `id`. Nothing else to wire.
- Watches the page scroll, not a scrolling panel.
