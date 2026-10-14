import { useState, useCallback } from "react";
import type {
  Category,
  Puzzle,
  WordEntry,
  BurnResult,
} from "../engine/types";
import {
  computeWordResult,
  applyResult,
  lettersOf,
} from "../engine/burn";
import { lookupWord } from "../engine/validate";
import { normalize } from "../engine/normalize";
import { computeScore } from "../engine/score";
import {
  localDateString,
  getPuzzleForDate,
  puzzleNumberForDate,
} from "../engine/daily";
import { config } from "../config";
import type { Stored, GameRecord } from "./storage";
import { load, save } from "./storage";
import words from "../data/words.json";
import categories from "../data/categories.json";
import puzzles from "../data/puzzles.json";

export type PromptState = {
  id: string;
  cleared: boolean;
  word?: string;
};

export type GameState = {
  date: string;
  number: number;
  prompts: PromptState[];
  burned: string[];
  borrowsLeft: number;
  borrowedCount: number;
  words: string[];
  status: "playing" | "finished";
  doubleDuties: number;
};

type Screen = "home" | "game" | "results" | "history" | "howto" | "practice";

type PreviewInfo = {
  recognized: boolean;
  display?: string;
  cleared: string[];
  burns: string[];
  borrows: string[];
  borrowCount: number;
  penalty: number;
  reason?: "nomatch" | "toomanyborrows";
};

type AppState = {
  screen: Screen;
  game: GameState | null;
  stored: Stored;
  message: string;
  preview: PreviewInfo | null;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function categoryById(id: string): Category | undefined {
  return (categories as Category[]).find((c) => c.id === id);
}

function emptyGame(date: string): GameState | null {
  const puzzle = getPuzzleForDate(date, puzzles as Record<string, Puzzle>);
  if (!puzzle) return null;
  return {
    date,
    number: puzzle.number,
    prompts: puzzle.prompts.map((id) => ({ id, cleared: false })),
    burned: [],
    borrowsLeft: config.maxBorrows,
    borrowedCount: 0,
    words: [],
    status: "playing",
    doubleDuties: 0,
  };
}

function scoreOf(game: GameState): number {
  const clearedCount = game.prompts.filter((p) => p.cleared).length;
  const unburned = 26 - game.burned.length;
  return computeScore({
    clearedCount,
    unburnedCount: unburned,
    borrowedCount: game.borrowedCount,
    pointsPerPrompt: config.pointsPerPrompt,
    pointsPerUnburned: config.pointsPerUnburned,
    pointsPerBorrow: config.pointsPerBorrow,
  });
}

export function useGame() {
  const [stored, setStored] = useState<Stored>(() => load());
  const [app, setApp] = useState<AppState>({
    screen: "home",
    game: null,
    stored,
    message: "",
    preview: null,
  });

  // Persist stored whenever it changes.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const persist = useCallback((s: Stored) => {
    save(s);
    setApp((a) => ({ ...a, stored: s }));
  }, []);

  const setMessage = useCallback((msg: string) => {
    setApp((a) => ({ ...a, message: msg }));
  }, []);

  const openIds = useCallback((): string[] => {
    if (!app.game) return [];
    return app.game.prompts.filter((p) => !p.cleared).map((p) => p.id);
  }, [app.game]);

  const burnedSet = useCallback((): Set<string> => {
    return new Set(app.game?.burned ?? []);
  }, [app.game]);

  const buildPreview = useCallback(
    (word: string): PreviewInfo => {
      const normalized = normalize(word);
      const entry = lookupWord(normalized, words as Record<string, WordEntry>);
      if (!entry) {
        return {
          recognized: false,
          cleared: [],
          burns: [],
          borrows: [],
          borrowCount: 0,
          penalty: 0,
        };
      }
      const result = computeWordResult({
        word: normalized,
        entry,
        burned: burnedSet(),
        openIds: openIds(),
        borrowsLeft: app.game?.borrowsLeft ?? 0,
      });
      const display = entry.display;
      if (!result.ok) {
        return {
          recognized: true,
          display,
          cleared: [],
          burns: result.burns,
          borrows: result.borrows,
          borrowCount: result.borrowCount,
          penalty: 8 * result.borrowCount,
          reason: result.reason,
        };
      }
      return {
        recognized: true,
        display,
        cleared: result.cleared,
        burns: result.burns,
        borrows: result.borrows,
        borrowCount: result.borrowCount,
        penalty: 8 * result.borrowCount,
      };
    },
    [app.game, burnedSet, openIds],
  );

  const startGame = useCallback((date: string) => {
    const game = emptyGame(date);
    if (!game) return;
    setApp((a) => ({ ...a, screen: "game", game, message: "", preview: null }));
  }, []);

  const submitWord = useCallback(
    (word: string) => {
      if (!app.game) return;
      const normalized = normalize(word);
      const entry = lookupWord(normalized, words as Record<string, WordEntry>);
      if (!entry) {
        setMessage(
          `We don't have "${word}" for any of today's prompts yet.`,
        );
        persist({
          ...app.stored,
          rejectedWords: [...app.stored.rejectedWords, word],
        });
        return;
      }
      const result = computeWordResult({
        word: normalized,
        entry,
        burned: burnedSet(),
        openIds: openIds(),
        borrowsLeft: app.game.borrowsLeft,
      });
      if (!result.ok) {
        if (result.reason === "nomatch") {
          setMessage(`${entry.display} doesn't fit anything left.`);
        } else {
          setMessage(
            `This needs ${result.borrowCount} borrow${result.borrowCount === 1 ? "" : "s"} but you have ${app.game.borrowsLeft} left.`,
          );
        }
        return;
      }
      const { burned, borrowsLeft } = applyResult(
        result,
        burnedSet(),
        app.game.borrowsLeft,
      );
      const nextPrompts = app.game.prompts.map((p) => {
        if (result.cleared.includes(p.id)) {
          return { ...p, cleared: true, word: entry.display };
        }
        return p;
      });
      const next: GameState = {
        ...app.game,
        prompts: nextPrompts,
        burned: [...burned].sort(),
        borrowsLeft,
        borrowedCount: app.game.borrowedCount + result.borrowCount,
        words: [...app.game.words, entry.display],
        doubleDuties: app.game.doubleDuties + (result.cleared.length >= 2 ? 1 : 0),
      };
      setApp((a) => ({
        ...a,
        game: next,
        message: "",
        preview: null,
      }));
      if (nextPrompts.every((p) => p.cleared)) {
        finishGame(next);
      }
    },
    [app.game, burnedSet, openIds, persist],
  );

  const msUntilMidnight = useCallback((): number => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }, []);

  const finishGame = useCallback((game: GameState) => {
    const record: GameRecord = {
      date: game.date,
      number: game.number,
      score: scoreOf(game),
      cleared: game.prompts.filter((p) => p.cleared).length,
      unburned: 26 - game.burned.length,
      borrows: game.borrowedCount,
      finished: true,
      prompts: game.prompts.map((p) => ({ id: p.id, word: p.word })),
      burned: [...game.burned].sort(),
      doubleDuties: game.doubleDuties,
    };
    const today = game.date;
    let current = app.stored.streak.current;
    let best = app.stored.streak.best;
    if (app.stored.streak.lastDate !== today) {
      const yesterday = localDateString(new Date(Date.now() - 86400000));
      current = app.stored.streak.lastDate === yesterday ? current + 1 : 1;
      if (current > best) best = current;
    }
    const nextStored: Stored = {
      ...app.stored,
      streak: { current, best, lastDate: today },
      history: [record, ...app.stored.history].slice(0, 50),
    };
    persist(nextStored);
    setApp((a) => ({ ...a, screen: "results", stored: nextStored }));
  }, [app.stored, persist, localDateString]);

  const quitGame = useCallback(() => {
    if (!app.game) return;
    finishGame(app.game);
  }, [app.game, finishGame]);

  const goHome = useCallback(() => {
    setApp((a) => ({ ...a, screen: "home", game: null, message: "", preview: null }));
  }, []);

  const setScreen = useCallback((screen: Screen) => {
    setApp((a) => ({ ...a, screen, message: "", preview: null }));
  }, []);

  return {
    app,
    ALPHABET,
    config,
    categories: categories as Category[],
    score: app.game ? scoreOf(app.game) : 0,
    openIds: openIds(),
    burnedSet: burnedSet(),
    buildPreview,
    startGame,
    submitWord,
    quitGame,
    goHome,
    setScreen,
    setMessage,
    msUntilMidnight,
  };
}
