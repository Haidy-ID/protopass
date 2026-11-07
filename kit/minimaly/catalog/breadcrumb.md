# Breadcrumb

Where the page sits, right after the brand in the header. Built from the page location: each parent links back, the current page ends the trail.

```html
<a class="brand" href="../../">…My prototypes</a>
<nav class="breadcrumb" aria-label="Breadcrumb">
  <span class="breadcrumb__sep">/</span><a href="../../?q=Lending">Lending</a>
  <span class="breadcrumb__sep">/</span><span aria-current="page">Lend an item</span>
</nav>
```

- One `.breadcrumb__sep` before each item: the trail continues the brand.
- Parents are links, 32 px high. The current page is plain text with `aria-current="page"`, cut with an ellipsis when too long.
- The home page has no trail: the brand alone.
