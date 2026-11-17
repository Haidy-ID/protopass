# Site footer

The end of every page of a website: the brand, columns of links, a legal line. An app screen has no footer.

```html
<footer class="site-footer">
  <div class="site-footer__brand"><span class="site-footer__name">Atlas</span><p>Lend it, track it, get it back.</p></div>
  <nav class="site-footer__col" aria-label="Product">
    <h3 class="site-footer__title">Product</h3>
    <a class="site-footer__link" href="features.html">Features</a>
    <a class="site-footer__link" href="pricing.html">Pricing</a>
  </nav>
  <p class="site-footer__legal">© 2026 Atlas. All rights reserved.</p>
</footer>
```

- Place it after the last `section`, not inside one: it keeps the page width by itself and draws a line above it.
- The brand takes two shares of the row, each column one. Two to four columns: they wrap under the brand on a narrow screen.
- Links are 32 px high, secondary, primary on hover. Each column is a `<nav>` named by `aria-label`.
