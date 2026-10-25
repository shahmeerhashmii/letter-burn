// Pure game rules. No DOM in here, so it can be tested with plain Node.

export const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

export function norm(s) {
  return String(s)
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function lettersOf(s) {
  return [...new Set(norm(s).replace(/[^a-z]/g, ""))];
}

// data = { categories: [ids], words: { key: [display, [tagIdx], [variants], [checkIdx]?] } }
export function buildIndex(data) {
  const idx = new Map();
  for (const k of Object.keys(data.words)) idx.set(k, k);
  for (const [k, v] of Object.entries(data.words)) {
    for (const variant of v[2]) if (!idx.has(variant)) idx.set(variant, k);
  }
  return idx;
}

export function lookup(index, typed) {
  const n = norm(typed);
  if (!n) return null;
  if (index.has(n)) return index.get(n);
  for (const suffix of ["es", "s"]) {
    if (n.endsWith(suffix) && index.has(n.slice(0, -suffix.length))) return index.get(n.slice(0, -suffix.length));
  }
  return null;
}

export function tagsOf(ctx, key) {
  return ctx.data.words[key][1].map((i) => ctx.data.categories[i]);
}

export function newGame(puzzle) {
  return { prompts: [...puzzle.prompts], burned: [], cleared: {}, borrows: 0, answers: [], done: false, endedEarly: false };
}

export function analyze(game, typed, ctx) {
  const n = norm(typed);
  if (!n) return { kind: "empty", letters: [], borrow: [], fresh: [] };
  const letters = lettersOf(n);
  const burned = new Set(game.burned);
  const borrow = letters.filter((l) => burned.has(l));
  const fresh = letters.filter((l) => !burned.has(l));
  const base = { typed: n, letters, borrow, fresh };
  const key = lookup(ctx.index, n);
  if (!key) return { ...base, kind: "unknown" };
  const tags = tagsOf(ctx, key);
  const matches = game.prompts.filter((p) => tags.includes(p) && !game.cleared[p]);
  if (!matches.length) return { ...base, key, kind: "nofit" };
  if (borrow.length > ctx.cfg.maxBorrows - game.borrows) return { ...base, key, matches, kind: "debt" };
  return { ...base, key, matches, kind: "ok" };
}

export function apply(game, a) {
  if (a.kind !== "ok" || game.done) return game;
  const word = a.typed.toUpperCase();
  const g = structuredClone(game);
  g.burned.push(...a.fresh);
  g.borrows += a.borrow.length;
  for (const p of a.matches) g.cleared[p] = word;
  g.answers.push({ word, prompts: a.matches, burned: a.fresh, borrowed: a.borrow });
  return g; // the game only ends when the player locks it in (finish)
}

export const allCleared = (g) => Object.keys(g.cleared).length === g.prompts.length;

// Replay a list of words from scratch. Used by undo, so taking a word back
// returns its letters and borrows exactly as if it had never been played.
export function replay(prompts, words, ctx) {
  let g = newGame({ prompts });
  for (const w of words) {
    const a = analyze(g, w, ctx);
    if (a.kind === "ok") g = apply(g, a); // a later word can become redundant; it just drops out
  }
  return g;
}

export function undo(game, index, ctx) {
  if (game.done || index < 0 || index >= game.answers.length) return game;
  const words = game.answers.filter((_, i) => i !== index).map((a) => a.word);
  return replay(game.prompts, words, ctx);
}

export function finish(game) {
  const g = structuredClone(game);
  g.done = true;
  g.endedEarly = Object.keys(g.cleared).length < g.prompts.length;
  return g;
}

export const clearedCount = (g) => Object.keys(g.cleared).length;
export const savedCount = (g) => 26 - g.burned.length;
export const doubles = (g) => g.answers.filter((a) => a.prompts.length > 1).length;

export function score(g, cfg) {
  return cfg.points.prompt * clearedCount(g) + cfg.points.letter * savedCount(g) - cfg.points.borrow * g.borrows;
}

export function shareText(g, num, cfg, url) {
  const burned = new Set(g.burned);
  const sq = ALPHABET.map((l) => (burned.has(l) ? "⬛" : "🟧"));
  return [
    `${cfg.name} #${num} · ${score(g, cfg)}`,
    sq.slice(0, 13).join(""),
    sq.slice(13).join(""),
    `${clearedCount(g)}/5 · ${savedCount(g)} saved · ${doubles(g)} double · ${g.borrows} borrowed`,
    url,
  ].filter(Boolean).join("\n");
}

// ---- dates (always the player's local calendar day) ----
export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const dayNumber = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};
export const daysBetween = (a, b) => dayNumber(b) - dayNumber(a);
export const puzzleNumber = (key, launch) => daysBetween(launch, key) + 1;
export function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}

// played = { dateKey: game } ; a finished day (even ended early) keeps the streak going
export function streak(played, today) {
  let day = played[today]?.done ? today : addDays(today, -1);
  let n = 0;
  while (played[day]?.done) { n++; day = addDays(day, -1); }
  return n;
}
