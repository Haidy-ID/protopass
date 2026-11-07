# Icon

Phosphor icons. Names are the Phosphor names in kebab-case: https://phosphoricons.com

```html
<i class="icon" data-icon="bell"></i>
<i class="icon" data-icon="warning" data-icon-style="fill"></i>
<i class="icon" data-icon="folder" style="--icon-size: 24px"></i>
```

- The page loads `ds.js` once, after the content. It inlines the SVG, so Copy to Figma gets vectors.
- Weights: `regular` (default), `bold`, `fill`, `light`, `thin`, `duotone`.
- The SVGs ship in `icons/` (Phosphor 2.1.1, MIT), so icons work offline.
- 16 px by default, `--icon-size` to change it. Color follows the text color.
- A misspelled name leaves a dashed red box and a console error.
