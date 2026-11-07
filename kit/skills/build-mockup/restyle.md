# Restyle a topic

A brand gives a topic's screens another look with tokens alone: colors, radius, fonts. Components stay the same. Use it to fit an identity, or to compare directions on the same screens.

1. **Read the contract.** `node kit/skills/build-mockup/contract.mjs "<design system>"`. **Done when** you know the roles and the pairs to keep.

2. **Declare the brands.** In `topic.json`: `"brands": ["Calm", "Bold"]`. The first one is the default. A name becomes a file in kebab-case: `brands/calm.css`.

3. **Write each brand.** Only `:root` selectors, only tokens of the design system. Raw values belong here and nowhere else.

   ```css
   /* A font from a brand: @import at the top of this file. */
   :root { --radius-lg: 12px; --font-family: "Fraunces", serif; }

   :root,
   :root[data-theme="light"] {
     --color-accent: #0F766E;
     --color-on-accent: #FFFFFF;
   }

   :root[data-theme="dark"] {
     --color-accent: #5EEAD4;
     --color-on-accent: #0B1F1C;
   }
   ```

   Keep the selectors exactly like this: they match the design system's, so the brand wins by coming later. A role needs a value in light and in dark. Change a color and its `--color-on-*` together. Every brand of a topic sets the same tokens, or the first one shows through. **Done when** the validator reports no M111.

4. **Import the first brand** in `screens.css`, after the design system: `@import "../brands/calm.css";`. The others stay out: the viewer and `lint.html` add them after it. **Done when** a screen opened alone shows the first brand.

5. **Check every brand.** `lint.html` renders each state in each theme and each brand: contrast problems show there, with `brand` in `window.lintResult.findings`. Read the render of the other brands in the viewer: `<topic>/?view=prototype&at=<screen>:<state>&brand=<brand>&theme=dark`. **Done when** 0 error and each brand has been seen in light and dark.

## What a brand cannot do

- Change a component's shape or layout: that belongs to the design system, see [new-component](../new-component/SKILL.md).
- Reach another topic: `brands/` lives in its topic. A look used everywhere is a design system.
- Change a screen's markup: a direction that needs other screens is another topic, or another exploration.
