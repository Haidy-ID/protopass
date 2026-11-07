# Text

Editorial type roles for websites: a hero line, a page title, section headings, an intro, a label above a title. Tool screens keep the regular sizes.

```html
<p class="text" data-variant="eyebrow">Design engineer · Lisbon</p>
<h1 class="text" data-variant="display">Interfaces that feel obvious.</h1>
<p class="text" data-variant="lead">I design and build interfaces for teams that ship.</p>
```

- `display` 60 px (one per page, the hero), `title` 48 px (a page title), `heading` 30 px (a section), `lead` 18 px secondary, one measure wide, `eyebrow` mono uppercase label.
- Under 640 px, display and title step down to 30 px and heading to 24 px.
- Put the class on the right element: `h1` for a title, `h2` for a heading. The role sets the look, never the outline.
