# Protopass: guide for agents

A prototype workshop: explore ideas, keep them organised, and hand the ready ones to a developer or an AI with everything needed to build them. Static site of topic pages for UX/UI prototypes. No build, no dependency: HTML, CSS and JS served as is by `node kit/serve.mjs` (no cache, live reload, update route).

## Layout

```
protopass.json    groups, then optional: published url, teams, design systems
index.html             home: latest topics, one card per group when there are several
<group>/index.html     topic list of the group (same file in every group)
<group>/topics.json    topic folder names of the group
<group>/<topic>/       index.html (never edited) · topic.json · screens/ · journal.md · deliverables
kit/               the kit, replaced as a whole on update: never edit it in a project
  minimaly/            default design system: catalog/<id>.md cards, components/<id>.html specimens
  skills/              how to work on topics (below)
```

## Skills

- Create a topic, a prototype-only topic, a journal entry or a story: [skills/new-topic.md](skills/new-topic.md).
- Build or edit screens: [skills/build-mockup/SKILL.md](skills/build-mockup/SKILL.md). Roles and safe pairs of a design system: `node kit/skills/build-mockup/contract.mjs "<design system>"`.
- Restyle a topic or compare looks: [skills/build-mockup/restyle.md](skills/build-mockup/restyle.md). Start from an image or a web page: [skills/build-mockup/from-reference.md](skills/build-mockup/from-reference.md).
- Create or upgrade a design system component: [skills/new-component/SKILL.md](skills/new-component/SKILL.md).
- Animated illustrations for stories and deliverables (optional): an illustration skill such as [Hairline](https://hairline.lucasmarkes.com/skills) (`npx skills add lucasmarkes/hairline`, MIT) makes one self-contained HTML figure per idea. Save it in the topic's `figures/` and embed it with `![caption](figures/<name>.html)`.

## Rules

- Screens use the topic's design system classes and roles only. Read the component card before writing its markup. Raw values and token overrides live in `brands/`, nowhere else.
- After each screen, unasked: `node kit/skills/build-mockup/validate.mjs <group>/<topic> <screen-id>`, the render check of build-mockup, then a screenshot of every state, read. Zero errors and every state seen before calling a screen done. A state not seen is named in the report, never called checked. Whole topic before calling the work done.
- After each iteration on a topic: one dated entry in its `journal.md`, with the reason of each change.
- Copy short and direct: user stories in one sentence ("As a lender, I should be able to …"), Q&A answers in one or two sentences, state notes in a few words.

## Pitfalls already met

- A show/hide behavior is verified in both directions. A component with `display: flex` beats the `hidden` attribute unless the CSS has `[hidden] { display: none; }`.
- Clipboard features (Copy to Figma, Copy post) are only proven by a real paste in the target app. Chrome drops a clipboard write when the page loses focus before an async conversion ends: prepare the payload before the click.
- Edit code that holds backslash escapes (regexes) with a file edit tool, not through a shell heredoc or a language string: each layer eats escapes and the rule silently stops matching.
