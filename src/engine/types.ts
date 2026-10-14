export type WordEntry = {
  display: string;
  tags: string[];
  variants?: string[];
};

export type Category = {
  id: string;
  prompt: string;
  note: string;
};

export type Puzzle = {
  number: number;
  prompts: string[];
  par?: number;
};

export type Puzzles = Record<string, Puzzle>;

export type BurnResult = {
  ok: boolean;
  reason?: "nomatch" | "toomanyborrows" | "unknown";
  cleared: string[];
  burns: string[];
  borrows: string[];
  borrowCount: number;
};
