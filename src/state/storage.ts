export type PromptResult = {
  id: string;
  word?: string;
};

export type GameRecord = {
  date: string;
  number: number;
  score: number;
  cleared: number;
  unburned: number;
  borrows: number;
  finished: boolean;
  prompts: PromptResult[];
  burned: string[];
  doubleDuties: number;
};

type Stored = {
  version: number;
  history: GameRecord[];
  streak: {
    current: number;
    best: number;
    lastDate: string | null;
  };
  tutorialSeen: boolean;
  rejectedWords: string[];
};

const STORAGE_KEY = "letterburn-v1";
const VERSION = 1;

function empty(): Stored {
  return {
    version: VERSION,
    history: [],
    streak: { current: 0, best: 0, lastDate: null },
    tutorialSeen: false,
    rejectedWords: [],
  };
}

export function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return migrate(parsed);
  } catch {
    return empty();
  }
}

export function save(stored: Stored): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

function migrate(parsed: Partial<Stored>): Stored {
  const s: Stored = {
    version: VERSION,
    history: Array.isArray(parsed.history) ? parsed.history : [],
    streak:
      parsed.streak && typeof parsed.streak.current === "number"
        ? {
            current: parsed.streak.current,
            best: parsed.streak.best ?? 0,
            lastDate: parsed.streak.lastDate ?? null,
          }
        : { current: 0, best: 0, lastDate: null },
    tutorialSeen: Boolean(parsed.tutorialSeen),
    rejectedWords: Array.isArray(parsed.rejectedWords)
      ? parsed.rejectedWords.filter((w): w is string => typeof w === "string")
      : [],
  };
  return s;
}
