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
  let routeCount = 0;
  let bestDoubleDuty = false;
  function dfs(index: number, usedLetters: number, covered: number, lettersCount: number, routeLen: number) {
    if (covered === full) {
      const score = 100 * n + 5 * (26 - lettersCount);
      const doubleDuty = routeLen < popcount(covered);
      if (score > bestScore) {
        bestScore = score;
        bestDoubleDuty = doubleDuty;
      }
      if (score === bestScore) routeCount++;
      return;
    }
    if (100 * n + 5 * (26 - lettersCount) < bestScore) return;
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
  return { score: bestScore, routeCount, doubleDuty: bestDoubleDuty };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const practice: { prompts: string[]; par?: number }[] = [];
let made = 0;
let attempts = 0;
while (made < 40 && attempts < 4000) {
  attempts++;
  const picked = shuffle(categoryIds).slice(0, 5);
  const result = solvePuzzle(picked);
  if (!result) continue;
  if (result.routeCount < 2) continue;
  if (!result.doubleDuty) continue;
  practice.push({ prompts: picked, par: result.score });
  made++;
}

writeFileSync(join(ROOT, "practice.json"), JSON.stringify(practice, null, 2) + "\n");
console.log(`Wrote ${practice.length} practice puzzles (attempts: ${attempts}).`);
