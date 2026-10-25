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

// data = { categories: [ids], words: { key: [[category numbers], [other spellings]?] } }
export function buildIndex(data) {
  // spelling -> every word it could be (a spelling can be a word and also another word's variant)
  const idx = new Map();
  const add = (s, k) => {
    const list = idx.get(s);
    if (!list) idx.set(s, [k]);
    else if (!list.includes(k)) list.push(k);
  };
  for (const k of Object.keys(data.words)) add(k, k);
  for (const [k, v] of Object.entries(data.words)) for (const variant of v[1] || []) add(variant, k);
  return idx;
}

// What the player typed, plus the singular forms it might be the plural of.
const IRREGULAR = { men: "man", women: "woman", children: "child", teeth: "tooth", feet: "foot", geese: "goose",
  mice: "mouse", people: "person", oxen: "ox", lice: "louse", dice: "die", cacti: "cactus", fungi: "fungus" };

function forms(n) {
  const out = [n];
  const last = n.split(" ").pop();
  for (const [pl, sg] of Object.entries(IRREGULAR)) {
    if (last === pl || (last.endsWith(pl) && pl.length > 3)) out.push(n.slice(0, n.length - pl.length) + sg);
  }
  if (n.endsWith("ies")) out.push(n.slice(0, -3) + "y");
  if (n.endsWith("ves")) out.push(n.slice(0, -3) + "f", n.slice(0, -3) + "fe");
  if (n.endsWith("es")) out.push(n.slice(0, -2));
  if (n.endsWith("s")) out.push(n.slice(0, -1));
  return out;
}

export function lookupAll(index, typed) {
  const n = norm(typed);
  if (!n) return [];
  const keys = [];
  for (const f of forms(n)) for (const k of index.get(f) || []) if (!keys.includes(k)) keys.push(k);
  return keys;
}

export function lookup(index, typed) {
  return lookupAll(index, typed)[0] || null;
}

export function tagsOf(ctx, key) {
  return ctx.data.words[key][0].map((i) => ctx.data.categories[i]);
}

// every category the typed word fits, across all the words it could be
export function tagsFor(ctx, typed) {
  return resolve(ctx, typed).tags;
}

const isWord = (ctx, w) => {
  if (!ctx.modifiers) return false;
  for (const f of forms(w)) if (ctx.modifiers.has(f) || ctx.index.has(f)) return true;
  return false;
};

// Find what the player meant. First the whole answer ("hot dog"). If that isn't a word we know,
// fall back to the end of it, as long as everything in front is a real word:
// "red grapes" -> grapes, "rescue dog" -> dog, "the beach" -> beach.
// A longer answer always costs more letters, so the extra words never help anyone cheat.
const ARTICLES = ["the ", "a ", "an ", "my ", "some ", "our ", "your "];

export function resolve(ctx, typed) {
  const n = norm(typed);
  // "the mountains", "a kite", "my room": read past the little word in front as well
  const art = ARTICLES.find((a) => n.startsWith(a) && n.length > a.length);
  if (art) {
    const whole = resolveCore(ctx, n);
    const rest = resolveCore(ctx, n.slice(art.length));
    const keys = [...new Set([...whole.keys, ...rest.keys])];
    const tags = [...new Set([...whole.tags, ...rest.tags])];
    return { keys, tags, head: whole.head || rest.head || (keys.length ? keys[0] : null) };
  }
  return resolveCore(ctx, n);
}

function resolveCore(ctx, n) {
  const keys = lookupAll(ctx.index, n);
  if (keys.length || !n.includes(" ")) return { keys, tags: tagsOfKeys(ctx, keys), head: null };
  // Unknown phrase: collect every reading that works (later words, or an activity at the front).
  const parts = n.split(" ");
  const found = [];
  for (let i = 1; i < parts.length; i++) {
    if (!isWord(ctx, parts[i - 1])) break;
    const tk = lookupAll(ctx.index, parts.slice(i).join(" "));
    if (tk.length) found.push(...tk);
  }
  // an activity plus what it's done to: "knitting scarves", "drawing pictures", "brewing beer"
  if (parts[0].endsWith("ing") && parts.slice(1).every((p) => isWord(ctx, p))) {
    for (let j = parts.length - 1; j >= 1; j--) {
      const lk = lookupAll(ctx.index, parts.slice(0, j).join(" "));
      if (lk.length) { found.push(...lk); break; }
    }
  }
  // answer shapes: "toy camera", "lake louise", "soccer game", "game night" (see data/frames.json)
  const extra = new Set();
  const fr = ctx.frames;
  if (fr) {
    const allWords = (s) => !!s && (lookupAll(ctx.index, s).length > 0 || s.split(" ").every((p) => isWord(ctx, p)));
    for (const [p, tags] of Object.entries(fr.prefix || {}))
      if (n.startsWith(p + " ") && allWords(n.slice(p.length + 1))) tags.forEach((t) => extra.add(t));
    for (const [p, tags] of Object.entries(fr.suffix || {}))
      if (n.endsWith(" " + p) && allWords(n.slice(0, -p.length - 1))) tags.forEach((t) => extra.add(t));
    for (const p of fr.inherit || []) {
      if (!n.endsWith(" " + p)) continue;
      const r = resolveCore(ctx, n.slice(0, -p.length - 1));
      if (r.keys.length) { found.push(...r.keys); r.tags.forEach((t) => extra.add(t)); }
    }
  }
  if (found.length || extra.size) {
    const ks = [...new Set(found)];
    const tags = new Set([...tagsOfKeys(ctx, ks), ...extra]);
    return { keys: ks, tags: [...tags], head: ks[0] || n };
  }
  return { keys: [], tags: [], head: null };
}

function tagsOfKeys(ctx, keys) {
  const tags = new Set();
  for (const k of keys) for (const t of tagsOf(ctx, k)) tags.add(t);
  return [...tags];
}

export function parseModifiers(text) {
  return new Set(text.split(/\s+/).filter(Boolean));
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
  const r = resolve(ctx, n);
  const key = r.keys[0];
  if (!key) return { ...base, kind: "unknown" };
  const tags = r.tags;
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
