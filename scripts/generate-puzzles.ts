import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src", "data");
const words: Record<string, { display: string; tags: string[]; variants?: string[] }> = JSON.parse(
  readFileSync(join(ROOT, "words.json"), "utf8"),
);
const categories: { id: string }[] = JSON.parse(
  readFileSync(join(ROOT, "categories.json"), "utf8"),
);
const categoryIds = categories.map((c) => c.id);

function letterMask(word: string): number {
  let m = 0;
  for (const ch of word) {
    const c = ch.toLowerCase();
    if (c >= "a" && c <= "z") m |= 1 << (c.charCodeAt(0) - 97);
  }
  return m;
}
function popcount(n: number): number {
  return n.toString(2).split("1").length - 1;
}

function solvePuzzle(prompts: string[]) {
  const n = prompts.length;
  const full = (1 << n) - 1;
  const promptSet = new Set(prompts);
  const cands: { word: string; promptMask: number; letterMask: number }[] = [];
  for (const word of Object.keys(words)) {
    const entry = words[word];
    const matched = entry.tags.filter((t) => promptSet.has(t));
    if (matched.length === 0) continue;
    let pm = 0;
    for (const t of matched) pm |= 1 << prompts.indexOf(t);
    cands.push({ word, promptMask: pm, letterMask: letterMask(word) });
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => popcount(a.letterMask) - popcount(b.letterMask) || b.promptMask - a.promptMask);

  let bestScore = -1;
  let bestLetters = Infinity;
  let routeCount = 0;
  let bestDoubleDuty = false;

  function dfs(
    index: number,
    usedLetters: number,
    covered: number,
    lettersCount: number,
    routeLen: number,
  ) {
    if (covered === full) {
      const score = 100 * n + 5 * (26 - lettersCount);
      const doubleDuty = routeLen < popcount(covered); // at least one word cleared >1 prompt
      if (score > bestScore || (score === bestScore && lettersCount < bestLetters)) {
        bestScore = score;
        bestLetters = lettersCount;
        bestDoubleDuty = doubleDuty;
      }
      if (score === bestScore) routeCount++;
      return;
    }
    const optimisticScore = 100 * n + 5 * (26 - lettersCount);
    if (optimisticScore < bestScore) return;
    const remaining = n - popcount(covered);
    if (lettersCount + remaining > 26) return;
    for (let i = index; i < cands.length; i++) {
      const c = cands[i];
      const newPrompts = c.promptMask & ~covered;
      if (newPrompts === 0) continue;
      if (c.letterMask & usedLetters) continue;
      const added = popcount(c.letterMask & ~usedLetters);
      dfs(i + 1, usedLetters | c.letterMask, covered | c.promptMask, lettersCount + added, routeLen + 1);
    }
  }

  dfs(0, 0, 0, 0, 0);
  if (bestScore < 0) return null;
  return { score: bestScore, letters: bestLetters, routeCount, doubleDuty: bestDoubleDuty };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const vowelSet = new Set(["a", "e", "i", "o", "u", "y"]);
function vowelPressure(prompts: string[]): number {
  // lower is better (spread vowels). Sum of distinct vowels needed across prompts' best words.
  let vowels = new Set<string>();
  for (const p of prompts) {
    const cands = Object.keys(words).filter((w) => words[w].tags.includes(p));
    if (cands.length === 0) return 99;
    // pick the word for this prompt with fewest vowels
    let best = 99;
    for (const w of cands) {
      const v = new Set(w.toLowerCase().split("").filter((c) => vowelSet.has(c))).size;
      if (v < best) best = v;
    }
    for (let i = 0; i < best; i++) vowels.add(String.fromCharCode(97 + i)); // rough
  }
  return vowels.size;
}

const LAUNCH = "2026-10-19";
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, "0");
  const D = String(date.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

const puzzles: Record<string, { number: number; prompts: string[] }> = {};
let totalAttempts = 0;
for (let i = 0; i < 60; i++) {
  const date = addDays(LAUNCH, i);
  let accepted = false;
  let attempts = 0;
  while (!accepted && attempts < 400) {
    attempts++;
    totalAttempts++;
    const picked = shuffle(categoryIds).slice(0, 5);
    const result = solvePuzzle(picked);
    if (!result) continue;
    if (result.routeCount < 3) continue;
    if (!result.doubleDuty) continue;
    if (result.letters > 15) continue;
    if (vowelPressure(picked) > 10) continue;
    puzzles[date] = { number: i + 1, prompts: picked };
    accepted = true;
  }
  if (!accepted) {
    // fallback: accept first solvable with >=2 routes
    for (let a = 0; a < 400; a++) {
      const picked = shuffle(categoryIds).slice(0, 5);
      const result = solvePuzzle(picked);
      if (result && result.routeCount >= 2) {
        puzzles[date] = { number: i + 1, prompts: picked };
        accepted = true;
        break;
      }
    }
  }
  if (!accepted) {
    console.error(`Could not generate a valid puzzle for ${date}`);
    process.exit(1);
  }
}

writeFileSync(join(ROOT, "puzzles.json"), JSON.stringify(puzzles, null, 2) + "\n");
console.log(`Wrote 60 puzzles from ${LAUNCH}. Total candidate attempts: ${totalAttempts}.`);
