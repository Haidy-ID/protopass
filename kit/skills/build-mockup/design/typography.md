# Typography

- **Few sizes.** A screen uses three or four sizes of the scale (`--font-size-*`), not every step. A title, a body, a small label, and a number if the screen has one.
- **Contrast between levels.** Neighbouring sizes do not make hierarchy. Jump two steps, or change the weight, or move the color to secondary.
- **Two weights do most of the work.** Regular for reading, semibold for what must be found. Bold everywhere means bold nowhere.
- **Keep lines readable.** Body text stays under `--measure`. Long text uses `--line-height-reading`, interface text `--line-height-normal`, big titles `--line-height-display`.
- **Sentence case.** Titles and buttons read like speech: "Add a loan", not "ADD A LOAN" or "Add A Loan". Capitals in a small label only, with `--letter-spacing-label`.
- **Numbers line up.** Tables and amounts use tabular figures and align right. A unit is smaller and quieter than its number.
- **Short labels.** A button is a verb and an object. A field label is a noun. Help text says what the label cannot.
- **Truncate on purpose.** Decide what happens with a long name: wrap, or an ellipsis with the full text in reach. Test it with the longest realistic value.

The design system's fonts stay unless the topic has a brand. Two font families at most.
