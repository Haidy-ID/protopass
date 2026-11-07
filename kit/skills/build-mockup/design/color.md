# Color

Read the contract first: `node kit/skills/build-mockup/contract.mjs "<design system>"`. It lists each role, its use and the pairs that stay readable.

- **Color carries meaning, not decoration.** If removing a color loses no information, remove it.
- **Mostly neutral.** A screen is surfaces, borders and text. `--color-ink` is for the main action and chosen states, `--color-accent` for links, focus and current position. Together they stay under a tenth of the screen.
- **Status colors mean status.** `--color-status-critical` is an error or a destructive action, never a highlight. Pair it with a word or an icon: color alone fails for many people.
- **Subtle fills hold their own tone.** Text on `--color-status-warning-subtle` is a text role or `--color-status-warning`, as the safe pairs list.
- **Layers by surface.** Page on `--color-surface`, content raised on `--color-surface-raised`, wells on `--color-surface-sunken`. Elevation comes from these roles first and from shadows second.
- **Dark is not an inverted light.** Roles handle it, as long as a screen never reads a primitive. Check every state in both themes. Images and charts need a look of their own.
- **Avoid the default AI palette.** A purple-to-blue gradient, a glow behind a card, a gradient on text: none of these say anything about the product.

A brand changes colors in `brands/`, never in a screen: see [restyle.md](../restyle.md).
