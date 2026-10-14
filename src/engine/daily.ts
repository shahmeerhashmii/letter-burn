export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getPuzzleForDate(
  dateStr: string,
  puzzles: Record<string, { number: number; prompts: string[]; par?: number }>,
): { number: number; prompts: string[]; par?: number } | null {
  return puzzles[dateStr] ?? null;
}

export function daysSinceLaunch(dateStr: string, launchDate: string): number {
  const toMs = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  return Math.round((toMs(dateStr) - toMs(launchDate)) / 86400000);
}

export function puzzleNumberForDate(dateStr: string, launchDate: string): number {
  return daysSinceLaunch(dateStr, launchDate) + 1;
}
