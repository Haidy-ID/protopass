# Site nav

A website's horizontal navigation in its header. An app with a side rail uses `shell` instead.

```html
<nav class="site-nav" aria-label="Main"><a class="site-nav__link" href="work.html" aria-current="page">Work</a><a class="site-nav__link" href="about.html">About</a></nav>
```

- `aria-current="page"` underlines the current page in accent. Links are 32 px high.
- Five links at most. On a phone, hide it and open the same links in a `drawer` from a menu button.
