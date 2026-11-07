# Start from a reference

Turn an image, a screenshot or a web page into a brand and screens that use the topic's design system. A reference gives direction: it does not replace the components.

1. **Describe before building.** Write what the reference shows: layout, density, type, color use, corners, what draws the eye. Say what you cannot see, such as hover states or the font's name. **Done when** the person could recognize the reference from your text.

2. **Count.** List the parts visible in the reference: how many columns, rows, cards, buttons, colors. An agent that rebuilds from memory drops elements. **Done when** each part has a line.

3. **Extract, do not guess.**
   - A web page: read its real values, computed colors, font families, sizes and radius.
   - An image: sample the colors you can. Mark every value you estimated.

   **Done when** every value is marked as read or estimated.

4. **Map to tokens.** For each value, take the nearest token of the contract (`node kit/skills/build-mockup/contract.mjs "<design system>"`). Colors with an identity go to a brand ([restyle.md](restyle.md)). Sizes and spacing go to the nearest step of the scale, never to a raw value. **Done when** no screen needs a value outside the tokens.

5. **Map to components.** Each part from step 2 becomes a component of the catalog. A part with no component: a local layout class, or [new-component](../new-component/SKILL.md).

6. **Build and compare.** Follow the loop of [SKILL.md](SKILL.md), then put the screenshot next to the reference and go through your list from step 2.

7. **List the gaps.** In the topic's `journal.md`: what stays different and why (no such component, a token rounded a step, a font replaced), and what was estimated. A gap you say is fine. A gap you hide is a bug.

Do not copy a third party's logo, images or text into a topic that leaves the person's machine. Use the reference's structure and direction, with the topic's own content.
