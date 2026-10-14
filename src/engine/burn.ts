import type { BurnResult, WordEntry } from "./types";
import { lettersOf, normalize } from "./normalize";

export function computeWordResult({
  word,
  entry,
  burned,
  openIds,
  borrowsLeft,
}: {
  word: string;
  entry: WordEntry;
  burned: Set<string>;
  openIds: string[];
  borrowsLeft: number;
}): BurnResult {
  const normalized = normalize(word);
  const letters = lettersOf(normalized);

  const openSet = new Set(openIds);
  const cleared = entry.tags.filter((t) => openSet.has(t));

  if (cleared.length === 0) {
    return { ok: false, reason: "nomatch", cleared: [], burns: [], borrows: [], borrowCount: 0 };
  }

  const burns = letters.filter((l) => !burned.has(l));
  const borrows = letters.filter((l) => burned.has(l));
  const borrowCount = borrows.length;

  if (borrowCount > borrowsLeft) {
    return { ok: false, reason: "toomanyborrows", cleared: [], burns, borrows, borrowCount };
  }

  return { ok: true, cleared, burns, borrows, borrowCount };
}

export function applyResult(
  result: BurnResult,
  burned: Set<string>,
  borrowsLeft: number,
): { burned: Set<string>; borrowsLeft: number } {
  const next = new Set(burned);
  for (const l of result.burns) next.add(l);
  return { burned: next, borrowsLeft: borrowsLeft - result.borrowCount };
}
