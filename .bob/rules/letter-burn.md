# Letter Burn: standing rules for Bob

These apply to every task in this repo. `LETTER_BURN_BRIEF.md` is the spec. If a request conflicts with the brief, point it out before doing anything.

## How to work
- Read `LETTER_BURN_BRIEF.md` at the start of any new task.
- Plan briefly, then build. Run `npm test` and `npm run build` before saying anything is done.
- Commit after each working stage with a plain message ("Add borrow logic and tests").
- Don't add dependencies without asking.
- Don't rewrite working code for style reasons.
- If a test fails, fix the cause. Never delete or weaken a test to get green.
- When you're unsure whether a word fits a category, put it in `review/needs-review.csv`. Never guess into `words.json`.
- No AI or network calls at runtime. Ever.

## Design: things that make it look AI-generated (don't do these)
- Purple, blue or rainbow gradients. Gradient text. Gradient buttons.
- Glassmorphism, frosted blur panels, glowing borders on every card.
- Everything centered in one floating card on a big empty background.
- `rounded-2xl` / `rounded-3xl` on everything. Tiles and cards use small radius (4 to 6px). Buttons 6px.
- Stacked soft shadows. Use borders and flat surfaces; one subtle shadow max.
- An icon next to every label. Use icons only where text alone would be unclear.
- Emoji in the UI. (Emoji are only allowed in the share text.)
- Sparkles, magic wands, rockets, brains, lightning bolts.
- Confetti, screen shake, bouncing buttons, pulsing "Play now" buttons.
- Default Tailwind colours (`bg-gray-800`, `text-indigo-500`). Only use the tokens from the brief.
- Inter, Poppins, Space Grotesk, Montserrat. Use the fonts in the brief.
- Hover effects that scale cards up.
- Placeholder text, lorem ipsum, fake testimonials, "Trusted by" sections.

## Copy: words and patterns to avoid
- "Unleash", "elevate", "embark", "journey", "dive in", "level up", "master", "challenge yourself", "test your skills", "seamless", "immersive", "ultimate".
- Exclamation marks in normal UI text.
- Em dashes anywhere in UI copy.
- Questions to the player like "Ready to play?" or "Can you beat it?"
- Explaining the obvious. If a button says Play, it doesn't need a subtitle.

## Design: things that make it feel made by a person
- One strong idea (matchbook / letterpress tiles) carried through, everything else quiet.
- Asymmetry where it helps: left-aligned headings, not everything centered.
- Real hierarchy: one big thing per screen (score on results, prompts in game).
- Tight, consistent spacing on a 4px grid.
- Numbers in the display font, large and tabular.
- Small details done well: the burn animation, the tile texture, the share grid.
- Empty and error states written with the same care as the main screen.

## Before calling any screen done
- Check it at 390px wide and at 1280px wide.
- Check it with `prefers-reduced-motion`.
- Tab through it with the keyboard.
- Count the orange things on screen. If it's more than three or four, tone it down.
