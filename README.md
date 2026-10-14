# Letter Burn

A daily word game. You get five everyday prompts and answer them with words. Every distinct letter you use burns out of your alphabet for the rest of the game. Finish all five while burning as few letters as possible.

**Tagline:** Every word costs you letters.

## Tech

React + TypeScript + Vite + Tailwind, Vitest for tests. One page (no router), localStorage for state. Deploys to GitHub Pages via GitHub Actions.

## Scripts

- `npm run dev` — start dev server
- `npm run test` — run the test suite
- `npm run build` — run the puzzle solver checks, then build for production
- `npm run check-puzzles` — validate all daily puzzles and write `par` into `src/data/puzzles.json`
- `npm run generate-data` — regenerate `src/data/words.json` and `categories.json`
- `npm run generate-puzzles` — generate 60 validated daily puzzles
- `npm run generate-practice` — generate 40 validated practice puzzles
- `npm run apply-review` — merge `review/needs-review.csv` decisions into `words.json`

## Data

- `src/config.ts` — game name, tagline, URL, scoring weights, launch date, suggestion form URL.
- `src/data/categories.json` — category id, prompt, note.
- `src/data/words.json` — validated dictionary: word → display, tags, variants.
- `src/data/puzzles.json` — 60 daily puzzles keyed by date, with `par` written by the solver.
- `src/data/practice.json` — 40 practice puzzles (separate from daily, never spoils upcoming days).
- `review/needs-review.csv` — borderline word/tag pairs for review (columns: word, tag, decision, reason).

Scoring lives in config: 100 per prompt cleared, 5 per unburned letter, 8 per borrowed letter, max 3 borrows per game. Par is computed by the solver and shown only after the game ends.

## Engine

Pure TypeScript in `src/engine/` (no React): `normalize.ts`, `validate.ts`, `burn.ts`, `score.ts`, `daily.ts`. Tests in `tests/`.

## Deploy

Pushes to `main` run GitHub Actions (`.github/workflows/deploy.yml`): install, build (which runs the solver checks), and deploy `dist` to GitHub Pages. Vite `base` is set to `/letter-burn/` for the repo name.

## Notes

- No AI or network calls at runtime.
- Puzzle data ships in the browser bundle; a determined person could peek ahead or edit localStorage. That's accepted for v1.
- Practice mode uses a separate puzzle set and never touches streaks, stats, or history.
