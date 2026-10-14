import type { WordEntry } from "./types";

export function lookupWord(
  normalized: string,
  words: Record<string, WordEntry>,
): WordEntry | null {
  const direct = words[normalized];
  if (direct) return direct;
  for (const entry of Object.values(words)) {
    if (entry.variants && entry.variants.includes(normalized)) {
      return entry;
    }
  }
  return null;
}
