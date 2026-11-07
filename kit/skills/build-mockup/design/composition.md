# Composition

The design system says what a part looks like. This file says where it goes and how loud it is. The design system wins any conflict.

- **One thing first.** Each screen has one job and one element that wins the eye. Squint at the render: if nothing leads, the screen is not finished.
- **One main action per view.** One `data-variant="primary"` in sight. Other actions are default or ghost buttons. Two primaries means nobody decided.
- **Rank with size, weight and space before color.** Move a label to `--color-text-secondary`, shrink it a step, or add room around the title. Reach for color last.
- **Group by distance.** Related parts sit closer than unrelated parts. Use a small gap inside a group (`--spacing-sm`), a clear jump between groups (`--spacing-xl` or more). Equal gaps everywhere read as a list of nothing.
- **Fewer boxes.** A card is for something that moves, opens or repeats. A title and its text need no border. Before adding a card, try a gap or a divider. Cards inside cards are a defect.
- **Align to few edges.** Text, inputs and buttons share a left edge. Numbers align right. Count the distinct left edges in a screen: more than three is noise.
- **Break the sameness.** Three identical columns or six identical tiles say nothing about priority. Make the important one bigger, or use a list.
- **Fit the device.** On a phone, one column, the main action within thumb reach, and nothing that needs hover. On desktop, keep text at `--measure` wide at most and use the extra room for context, not for stretching.
- **Look at the emptiest and the fullest case.** A layout that works with three rows may collapse with one or with thirty. The screen's states exist for that.

Before calling a screen done, name out loud what wins the eye, what comes second, and what could be removed. Remove one thing.
