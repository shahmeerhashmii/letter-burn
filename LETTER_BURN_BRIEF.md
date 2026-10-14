# Letter Burn: Build Brief

Read this whole file before writing any code. It is the single source of truth for the game. If something here is unclear or contradicts itself, stop and ask me rather than guessing.

"Letter Burn" is the working name. Keep the name, tagline and URL in one config file (`src/config.ts`) so I can rename the game later without hunting through the code.

---

## 1. The game in one paragraph

A daily word game. You get five everyday prompts ("Name an animal", "Name something you wear"). You answer them with words, and every distinct letter you use burns out of your alphabet for the rest of the game. One clever word can clear more than one prompt at once. Finish all five while burning as few letters as possible. Same puzzle for everyone each day, one try, share your score with friends without spoiling answers.

Tagline: **Every word costs you letters.**

The real tension is vowels. There are only six (A E I O U Y). Burn A and I on your first two answers and the last three get hard fast. That pressure is the game, so protect it.

---

## 2. Rules (exact)

### Starting state
- 26 letters available.
- 5 prompts, all open.
- 3 borrows available.
- No timer, no hints.

### Answering
- The player just types a word. They do **not** need to pick a prompt first.
- As they type, a live preview shows:
  - whether the word is recognized
  - which open prompts it would clear
  - which letters would burn
  - which already-burned letters it needs to borrow, and the penalty
- If the word clears zero open prompts, it can't be submitted. Say why in plain language.
- The player taps **Burn it** (or presses Enter) to confirm. Nothing changes until they confirm.
- A submitted word clears **every** open prompt it matches. This is Double Duty (two prompts) or Triple Duty (three). A prompt can only be cleared once.

### Letters
- Only letters count. Spaces, hyphens and apostrophes are ignored for cost. ("ice cream" costs I C E R A M.)
- Each distinct letter in a word burns once. APPLE burns A P L E.
- Burned letters stay burned for the rest of the game.

### Borrowing (Letter Debt)
- If a word uses a letter that's already burned, that letter is borrowed.
- Each borrowed letter costs **8 points** and uses up one of the 3 borrows. A letter repeated inside one word only counts once.
- Borrowing never un-burns a letter. Borrowing E again in a later word costs again.
- If a word needs more borrows than the player has left, it can't be submitted. Say so clearly.
- Why 8: a letter left unburned is worth 5 points. If borrowing cost less than 5, reusing letters would beat saving them and the whole strategy flips. Keep borrow penalty above letter value. Put both numbers in config.

### Ending
- The game ends when all five prompts are cleared, or when the player taps **I'm done** (always available after the first answer, with a confirm step).
- A partial game still records a score and still counts toward the streak.
- Never leave someone stuck with no explanation. If no borrows are left, show "I'm done" more prominently.

### Score
```
score = 100 × prompts cleared
      + 5 × letters still unburned
      − 8 × letters borrowed
```
All three weights live in config.

Example: all 5 cleared, 9 letters burned, no borrows = 500 + 85 = **585**.

### Par
Because we solve every puzzle in advance (see section 6), we know the best possible score for each day. Show it **only after** the player finishes: "Today's best possible: 591. You got 585." This gives people something to chase and talk about. Never show it mid-game.

---

## 3. Answer data (the most important part)

Players will forgive a hard puzzle. They won't forgive the game rejecting "shoe" for "something you wear." Answer coverage matters more than anything visual.

### Rules
- Validation uses a curated dictionary only. **No AI calls at runtime. No accepting any English word.**
- Store the dictionary as `src/data/words.json`:
```json
{
  "fish":  { "display": "Fish",  "tags": ["animal", "food", "sea_creature", "pet"], "variants": ["fishes"] },
  "cap":   { "display": "Cap",   "tags": ["clothing", "headwear", "beach_item"] },
  "bee":   { "display": "Bee",   "tags": ["animal", "insect", "flies"] },
  "ice cream": { "display": "Ice cream", "tags": ["food", "dessert", "cold_thing", "beach_item"], "variants": ["icecream", "ice-cream"] }
}
```
- Categories live in `src/data/categories.json` with an id, the prompt text players see, and a short note on what counts:
```json
{ "id": "flies", "prompt": "Name something that can fly", "note": "Birds, flying insects, aircraft, kites. Not 'time'." }
```
- Normalize input: lowercase, trim, collapse spaces, strip accents. Match the word or any variant.
- Plurals: accept regular plurals automatically (add -s / -es) and list irregular ones as variants. The player pays for whatever letters they actually typed.
- American and British spellings both count (color/colour, pajamas/pyjamas). I'm in Canada.

### Coverage targets
- **50 to 60 categories**, all everyday, nothing a 12-year-old or a 70-year-old wouldn't get. Spread them across food and drink, animals and nature, home, clothing, travel, sports and games, weather and seasons, places, jobs, and common activities. Avoid categories that overlap almost completely (e.g. "pet" and "animal you can keep at home").
- At least **120 accepted answers per category**, most categories 200+. Include short words, long words, and common two-word answers.
- Tag every answer with **every** category it honestly fits. Missing tags are what break Double Duty.

### How to build it
1. Generate the draft dictionary yourself.
2. For each word/tag pair, mark confidence. Anything you're not sure about goes in `review/needs-review.csv` (columns: word, tag, reason) instead of straight into the data.
3. I'll review that CSV and mark keep or drop. Write a script `npm run apply-review` that merges my decisions back in.
4. Don't make me review the obvious ones. Only send me the borderline cases.

### Unknown words
- Message: "We don't have **{word}** for any of today's prompts yet." No letters burn, no penalty.
- Add a small "Think it should count?" link that opens a form URL from config (I'll plug in a Google Form). If the URL is empty, hide the link.
- Also keep a local list of rejected words in storage so I can check my own misses during testing.

---

## 4. Daily puzzles

### Format
`src/data/puzzles.json`, keyed by date:
```json
{
  "2026-11-01": { "number": 1, "prompts": ["animal", "food", "clothing", "beach_item", "flies"], "par": 591 }
}
```
`par` is written by the solver script, never by hand.

### Date logic
- The day flips at the **player's local midnight**, like Wordle. Puzzle for "2026-11-01" is the same for everyone whose local date is Nov 1.
- Puzzle number counts from the launch date in config.
- If there's no puzzle for today's date, show a friendly "No puzzle today, we're restocking" screen. Never fall back to a random or repeated puzzle.
- Show a countdown to the next puzzle on the results screen.

### Puzzle rules
- 5 prompts, all different categories.
- At least **one real Double Duty** opportunity using a common word.
- Solvable with **zero borrows** using only common words.
- More than one good route. If one word is clearly the best answer for three prompts, the puzzle is too obvious.
- Spread vowel pressure around. Don't build days where every good answer needs the same vowel.
- Prepare **60 days** of puzzles before launch.

---

## 5. Practice mode
- Unlimited random puzzles from the validated pool, using a separate set of practice puzzles (not future daily ones, so practice doesn't spoil upcoming days).
- Practice never touches streaks, stats or history.
- Clearly labeled so nobody thinks it's the daily.

---

## 6. Solver and validation scripts

Write `scripts/solve.ts` and run it with `npm run check-puzzles`. For every puzzle it must:

1. Confirm every prompt's category exists and has enough answers.
2. Search for the best possible score with no borrows (sequences of words, where each word clears at least one open prompt and shares no letters with earlier words). Prune hard; it should finish all 60 puzzles in under a minute.
3. Write `par` back into `puzzles.json`.
4. Count distinct solution routes and flag puzzles with fewer than 3.
5. Flag puzzles with no Double Duty available.
6. Flag puzzles where par is suspiciously high (one obvious route) or where no zero-borrow solution exists.
7. Print a readable report: date, prompts, par, an example best route, number of routes, warnings.

The build should fail if any scheduled daily puzzle is unsolvable or missing a category.

---

## 7. Screens

Keep it to what's listed. No extra pages, settings screens, or menus.

**Home**
- Game name, tagline, today's puzzle number.
- Big **Play** button (or **See results** if today is done).
- Streak.
- "How to play" and "Practice" as small text links.

**How to play** (auto-shows on first visit, can be reopened)
- Four short steps, max one line each.
- Use FISH clearing "animal" and "food" as the worked example, with a tiny animated version of the burn.
- Skippable.

**Game**
- Top bar: puzzle number, prompts cleared (x/5), borrows left, current score.
- Five prompt cards. Cleared cards show the word used and a check, and dim.
- Answer input with the live preview from section 2.
- Alphabet bank always visible, A to Z, in a fixed grid.
- On mobile, prompts + input + alphabet must fit without scrolling on a 390×844 screen with the keyboard closed. With the keyboard open, the input and preview stay visible.

**Results**
- Puzzle number, prompts cleared, score, letters saved, borrows used, Double Duties.
- The words they used, per prompt (it's their own screen, spoilers are fine here).
- Par comparison.
- Share button.
- Countdown to tomorrow, streak, link to practice, link to past results.

**Past results**
- Simple list: date, number, score, letters saved. Tap one to see that day's breakdown.

---

## 8. Sharing

Copy to clipboard, and use the native share sheet where supported. No answers in the share text.

The letter row is the visual hook. 26 squares in A-Z order, burned vs saved, like Wordle's grid:

```
Letter Burn #12 · 585
⬛⬛🟧⬛🟧🟧⬛⬛⬛🟧🟧⬛🟧
⬛🟧⬛🟧⬛🟧🟧⬛🟧🟧⬛🟧🟧
5/5 · 17 saved · 2 double · 0 borrowed
letterburn.example
```
(🟧 = saved, ⬛ = burned, two rows of 13.) Keep the share text short. No "Can you beat my score?" style lines.

---

## 9. Look and feel

This needs to look like a person with taste made it, not like a template. Read `.bob/rules/letter-burn.md` for the full design rules, they are strict.

### Concept: a matchbook
The visual idea is an old matchbook and letterpress type. Letter tiles are like small wooden type blocks or matches. When a letter burns, the tile chars: it flares orange for a moment, then goes dark with a faint scorched texture, and the letter is still faintly readable underneath. Everything else is quiet so the burn is the one moment of drama.

### Colours (use as CSS variables, nothing outside this list)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#15181F` | page |
| `--surface` | `#222733` | panels |
| `--card` | `#2A303D` | prompt cards |
| `--flame` | `#FF8C42` | burn moment, primary button |
| `--ember` | `#FFC76A` | highlights, Double Duty |
| `--ok` | `#56C596` | cleared prompts |
| `--text` | `#F5F5F5` | main text |
| `--muted` | `#AAB2C0` | secondary text |
| `--ash` | `#343841` | burned tiles |
| `--warn` | `#E96B6B` | errors, borrow warnings |

Orange is precious. If more than a few things on screen are orange at once, something is wrong.

### Type
- Display (game name, big numbers, letter tiles): **Big Shoulders Display**, bold. Condensed and a bit industrial, like printing on a matchbox.
- Everything else: **Instrument Sans**.
- Self-host both with `@fontsource` packages. No Google Fonts link at runtime.
- Letter tiles: uppercase, large, tabular.

### Motion
- Burn: tile flares (about 150ms), chars (about 300ms), settles. Stagger multiple letters by about 40ms so a word burns left to right.
- Double Duty: both prompt cards clear together with one short "Double Duty" label that fades. No confetti, no screen shake.
- Score changes count up quickly.
- Respect `prefers-reduced-motion`: swap animations for instant state changes.
- Pure CSS where possible. No animation libraries.

### Accessibility
- Burned vs available must be clear without colour (texture + letter opacity + `aria-label` like "E, burned").
- Everything works with keyboard only. Visible focus rings in `--ember`.
- Tap targets at least 44px.
- Screen reader announces what a submission did ("Fish cleared Animal and Food. Burned F, I, S, H.").

### Copy voice
Short, plain, a little dry. Like a friend explaining a bar game. Examples:
- Empty input: "Type a word."
- Unknown: "We don't have **zebra** for any of today's prompts yet."
- No match: "**Lamp** doesn't fit anything left."
- Borrow warning: "This borrows **E** and **A**. −16 points."
- Finished all five: "All five. 17 letters left standing."
- Stopped early: "3 of 5. Tomorrow's a new box of matches."

No exclamation marks in normal UI copy. No em dashes anywhere in the UI.

---

## 10. Tech

- React + TypeScript + Vite + Tailwind (Tailwind config should expose the tokens above, not the default palette).
- Vitest for tests.
- **No router.** It's one page that switches screens with state. This avoids GitHub Pages 404s on refresh.
- localStorage for everything, behind a small `storage.ts` with a version number and migrations. Store: today's game state, history, streak, tutorial seen, rejected words.
- Refresh mid-game restores exactly where they were. Refresh after finishing goes to results.
- Deploy to GitHub Pages with a GitHub Actions workflow. Set Vite `base` correctly for the repo name (read it from config).
- Keep dependencies minimal. Ask before adding anything beyond React, Tailwind, Vitest and fontsource.

### Suggested structure (adapt if you have a better reason)
```
src/
  config.ts
  data/          words.json, categories.json, puzzles.json, practice.json
  engine/        normalize.ts, validate.ts, burn.ts, score.ts, daily.ts
  state/         useGame.ts, storage.ts
  screens/       Home.tsx, Game.tsx, Results.tsx, History.tsx, HowTo.tsx, Practice.tsx
  components/    AlphabetBank.tsx, LetterTile.tsx, PromptCard.tsx, AnswerInput.tsx, Preview.tsx, ShareButton.tsx
  styles/        tokens.css, globals.css
scripts/         solve.ts, apply-review.ts
review/          needs-review.csv
tests/
```
The engine folder must be pure TypeScript with no React, so it's easy to test.

### Tests that must exist and pass
- APPLE burns exactly A P L E.
- "ice cream" ignores the space.
- FISH clears animal + food in one submission and burns letters once.
- PEAR after APPLE borrows P E A, burns R, costs 24, uses all 3 borrows.
- A word needing 4 borrows with 3 left is rejected and changes nothing.
- Unknown word changes nothing.
- A word matching zero open prompts changes nothing.
- Score formula matches the 585 example.
- Same date gives the same puzzle; missing date gives the "restocking" state.
- Local midnight rollover works (test with a mocked clock in two time zones).
- Storage survives a reload and migrates from an older version.
- Every scheduled puzzle passes the solver checks.

---

## 11. Build order

Do all of this in one run, in this order. After each stage: run tests, fix failures, commit with a clear message, then continue. Don't stop to ask me unless you hit a real decision this brief doesn't cover.

1. **Plan.** Write `PLAN.md`: architecture, file list, anything in this brief you think is wrong or risky. Keep it under a page.
2. **Engine.** Normalize, validate, burn, borrow, score, with tests. Small hand-written sample data (3 puzzles, ~15 categories, ~40 words each) to start.
3. **Playable game.** All screens working with plain styling. Should be fully playable start to finish.
4. **Real data.** Full categories and dictionary, `needs-review.csv`, solver script, 60 daily puzzles plus 40 practice puzzles, all passing checks.
5. **Design pass.** Apply section 9 and the rules file properly. Burn animation, typography, mobile layout.
6. **Daily system.** Persistence, streaks, history, countdown, share, practice mode.
7. **Ship.** GitHub Actions deploy to Pages, README with: how to run locally, how to add puzzles, how to review words, how to run the solver.

---

## 12. Not in version 1

Don't build any of these, even partially: accounts, leaderboards, a backend, friend groups, themed weeks, special rule days, analytics, hints, power-ups, image share cards, sound. Note good ideas in `IDEAS.md` instead.

Known and accepted for v1: the puzzle data is in the browser bundle, so a determined person could peek ahead or edit their localStorage. That's fine for a game played with friends.
