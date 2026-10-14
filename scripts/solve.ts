import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src", "data");
const words: Record<string, { display: string; tags: string[]; variants?: string[] }> = JSON.parse(
  readFileSync(join(ROOT, "words.json"), "utf8"),
);
const categories: { id: string; prompt: string; note: string }[] = JSON.parse(
  readFileSync(join(ROOT, "categories.json"), "utf8"),
);
const puzzles: Record<string, { number: number; prompts: string[]; par?: number }> = JSON.parse(
  readFileSync(join(ROOT, "puzzles.json"), "utf8"),
);

const categoryIds = new Set(categories.map((c) => c.id));

// 26-bit letter mask for a word.
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

// Candidate words that match at least one prompt of the puzzle, limited to
// words whose letters don't overlap in a way that makes them unusable.
function candidatesFor(prompts: string[]): { word: string; promptMask: number; letterMask: number }[] {
  const promptSet = new Set(prompts);
  const out: { word: string; promptMask: number; letterMask: number }[] = [];
  for (const word of Object.keys(words)) {
    const entry = words[word];
    const matched = entry.tags.filter((t) => promptSet.has(t));
    if (matched.length === 0) continue;
    let pm = 0;
    for (const t of matched) pm |= 1 << prompts.indexOf(t);
    out.push({ word, promptMask: pm, letterMask: letterMask(word) });
  }
  return out;
}

// Search for the best zero-borrow solution covering all prompts, minimizing
// total distinct letters burned (which maximizes score). Returns best score,
// the letter mask, and the list of words in a best route, plus total route count.
function solvePuzzle(prompts: string[]) {
  const n = prompts.length;
  const full = (1 << n) - 1;
  const cands = candidatesFor(prompts);
  if (cands.length === 0) return null;

  // Sort candidates: fewer letters first, more prompts first.
  cands.sort((a, b) => popcount(a.letterMask) - popcount(b.letterMask) || b.promptMask - a.promptMask);

  let bestLetters = Infinity;
  let bestScore = -1;
  let bestRoute: string[] = [];
  let routeCount = 0;
  let bestDoubleDuty = false;

  // Depth-first search over candidates.
  function dfs(index: number, usedLetters: number, covered: number, route: string[], lettersCount: number) {
    if (covered === full) {
      const score = 100 * n + 5 * (26 - lettersCount);
      const doubleDuty = route.some((w) => {
        const c = cands.find((x) => x.word === w)!;
        return popcount(c.promptMask) >= 2;
      });
      if (score > bestScore || (score === bestScore && lettersCount < bestLetters)) {
        bestScore = score;
        bestLetters = lettersCount;
        bestRoute = [...route];
        bestDoubleDuty = doubleDuty;
      }
      if (score === bestScore) routeCount++;
      return;
    }
    // Prune: cannot beat best score.
    const optimisticScore = 100 * n + 5 * (26 - lettersCount);
    if (optimisticScore < bestScore) return;
    // Need to cover remaining prompts; each remaining word adds >=1 new prompt.
    const remaining = n - popcount(covered);
    if (lettersCount + remaining > 26) return;

    for (let i = index; i < cands.length; i++) {
      const c = cands[i];
      // Must add at least one new prompt.
      const newPrompts = c.promptMask & ~covered;
      if (newPrompts === 0) continue;
      // Letters must not overlap with already burned letters.
      if (c.letterMask & usedLetters) continue;
      const added = popcount(c.letterMask & ~usedLetters);
      dfs(i + 1, usedLetters | c.letterMask, covered | c.promptMask, [...route, c.word], lettersCount + added);
    }
  }

  dfs(0, 0, 0, [], 0);

  if (bestScore < 0) return null; // no solution
  return {
    score: bestScore,
    letters: bestLetters,
    route: bestRoute,
    routeCount,
    doubleDuty: bestDoubleDuty,
  };
}

let failed = false;
const report: string[] = [];

const dates = Object.keys(puzzles).sort();
for (const date of dates) {
  const p = puzzles[date];
  const prompts = p.prompts;
  // 1. confirm categories exist
  const missing = prompts.filter((id) => !categoryIds.has(id));
  if (missing.length) {
    failed = true;
    report.push(`[${date} #${p.number}] MISSING CATEGORIES: ${missing.join(", ")}`);
    continue;
  }
  // 2-7. solve
  const result = solvePuzzle(prompts);
  if (!result) {
    failed = true;
    report.push(`[${date} #${p.number}] NO ZERO-BORROW SOLUTION`);
    continue;
  }
  // par
  p.par = result.score;
  const flags: string[] = [];
  if (result.routeCount < 3) flags.push(`FEW ROUTES (${result.routeCount})`);
  if (!result.doubleDuty) flags.push("NO DOUBLE DUTY");
  if (result.letters > 14) flags.push(`HIGH LETTER COST (${result.letters})`);
  const flagStr = flags.length ? `  !! ${flags.join(", ")}` : "";
  report.push(
    `[${date} #${p.number}] par=${result.score} letters=${result.letters} routes=${result.routeCount} route=${result.route.join(" + ")}${flagStr}`,
  );
}

if (failed) {
  report.push("\nBUILD FAIL: one or more puzzles are unsolvable or missing categories.");
  console.error(report.join("\n"));
  process.exit(1);
}

writeFileSync(join(ROOT, "puzzles.json"), JSON.stringify(puzzles, null, 2) + "\n");
console.log(report.join("\n"));
