export function normalize(word: string): string {
  return stripAccents(word)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
}

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function lettersOf(word: string): string[] {
  const seen = new Set<string>();
  for (const ch of word) {
    const c = ch.toLowerCase();
    if (c >= "a" && c <= "z") seen.add(c);
  }
  return [...seen];
}
