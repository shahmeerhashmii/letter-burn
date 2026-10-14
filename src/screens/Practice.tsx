import { useState, useCallback } from "react";
import { useGame } from "../state/useGame";
import {
  computeWordResult,
  applyResult,
} from "../engine/burn";
import { lookupWord } from "../engine/validate";
import { normalize } from "../engine/normalize";
import { computeScore } from "../engine/score";
import { config } from "../config";
import practice from "../data/practice.json";
import words from "../data/words.json";
import { AnswerInput } from "../components/AnswerInput";
import { Preview } from "../components/Preview";
import { PromptCard } from "../components/PromptCard";
import { AlphabetBank } from "../components/AlphabetBank";

type PracticePuzzle = { prompts: string[]; par?: number };

export default function Practice({ onClose }: { onClose: () => void }) {
  useGame();
  const puzzles = practice as PracticePuzzle[];
  const [puzzle, setPuzzle] = useState<PracticePuzzle | null>(null);
  const [game, setGame] = useState<{
    prompts: { id: string; cleared: boolean; word?: string }[];
    burned: string[];
    borrowsLeft: number;
    borrowedCount: number;
    words: string[];
    status: "playing" | "finished";
  } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<any>(null);

  const start = useCallback(() => {
    const p = puzzles[Math.floor(Math.random() * puzzles.length)];
    setPuzzle(p);
    setGame({
      prompts: p.prompts.map((id) => ({ id, cleared: false })),
      burned: [],
      borrowsLeft: config.maxBorrows,
      borrowedCount: 0,
      words: [],
      status: "playing",
    });
    setMessage("");
    setPreview(null);
    setInputValue("");
  }, [puzzles]);

  const burnedSet = () => new Set(game?.burned ?? []);
  const openIds = () =>
    game?.prompts.filter((p) => !p.cleared).map((p) => p.id) ?? [];

  const buildPrev = useCallback(
    (word: string) => {
      if (!game) return null;
      const normalized = normalize(word);
      const entry = lookupWord(normalized, words as Record<string, any>);
      if (!entry) return { recognized: false };
      const result = computeWordResult({
        word: normalized,
        entry,
        burned: burnedSet(),
        openIds: openIds(),
        borrowsLeft: game.borrowsLeft,
      });
      return {
        recognized: true,
        display: entry.display,
        cleared: result.cleared,
        burns: result.burns,
        borrows: result.borrows,
        borrowCount: result.borrowCount,
        penalty: 8 * result.borrowCount,
        reason: result.reason,
      };
    },
    [game],
  );

  const submit = useCallback(
    (word: string) => {
      if (!game) return;
      const normalized = normalize(word);
      const entry = lookupWord(normalized, words as Record<string, any>);
      if (!entry) {
        setMessage(`We don't have "${word}" yet.`);
        return;
      }
      const result = computeWordResult({
        word: normalized,
        entry,
        burned: burnedSet(),
        openIds: openIds(),
        borrowsLeft: game.borrowsLeft,
      });
      if (!result.ok) {
        if (result.reason === "nomatch") {
          setMessage(`${entry.display} doesn't fit anything left.`);
        } else {
          setMessage(
            `Needs ${result.borrowCount} borrow${result.borrowCount === 1 ? "" : "s"}, you have ${game.borrowsLeft}.`,
          );
        }
        return;
      }
      const { burned, borrowsLeft } = applyResult(result, burnedSet(), game.borrowsLeft);
      const nextPrompts = game.prompts.map((p) =>
        result.cleared.includes(p.id) ? { ...p, cleared: true, word: entry.display } : p,
      );
      const next = {
        ...game,
        prompts: nextPrompts,
        burned: [...burned].sort(),
        borrowsLeft,
        borrowedCount: game.borrowedCount + result.borrowCount,
        words: [...game.words, entry.display],
      };
      setGame(next);
      setMessage("");
      setPreview(null);
      setInputValue("");
      if (nextPrompts.every((p) => p.cleared)) {
        setGame({ ...next, status: "finished" });
      }
    },
    [game],
  );

  const clearedCount = game?.prompts.filter((p) => p.cleared).length ?? 0;
  const unburned = game ? 26 - game.burned.length : 26;
  const score = game
    ? config.pointsPerPrompt * clearedCount +
      config.pointsPerUnbounded * unburned -
      config.pointsPerBorrow * game.borrowedCount
    : 0;

  if (!puzzle) {
    start();
  }

  return (
    <div className="screen surface min-h-screen">
      <div className="p-3">
        <h2 className="font-display text-2xl mb-2">Practice</h2>
        <p className="text-muted mb-4">
          Random puzzle. Practice never touches your streak or history.
        </p>
        {game ? (
          <>
            <div className="row-between mb-3">
              <div className="font-display text-xl">{clearedCount} / 5 cleared</div>
              <div className="font-display text-xl text-ember">{game.borrowsLeft}</div>
            </div>
            {message && <p className="text-warn mb-3 text-sm">{message}</p>}
            <div className="mb-3">
              {game.prompts.map((p) => {
                const cat = (categories as { id: string; prompt: string }[]).find(
                  (c) => c.id === p.id,
                );
                return (
                  <PromptCard
                    key={p.id}
                    id={p.id}
                    prompt={cat?.prompt ?? p.id}
                    cleared={p.cleared}
                    word={p.word}
                  />
                );
              })}
            </div>
            <AnswerInput
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onSubmit={submit}
              placeholder="Type a word"
              disabled={game.status === "finished"}
            />
            {preview && <Preview preview={preview} openCount={openIds().length} />}
            <div className="mt-3">
              <div className="text-muted text-sm mb-2">Score {score}</div>
              <AlphabetBank
                burned={new Set(game.burned)}
                burning={[]}
                onLetterPress={(l) => setInputValue((v) => v + l)}
              />
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="button button-text focus-ring"
                onClick={start}
              >
                New puzzle
              </button>
              <button
                type="button"
                className="button button-text focus-ring ml-2"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const categories: { id: string; prompt: string }[] = [
  { id: "animal", prompt: "Animal" },
  { id: "mammal", prompt: "Mammal" },
  { id: "bird", prompt: "Bird" },
  { id: "insect", prompt: "Insect" },
  { id: "fish", prompt: "Fish or sea creature" },
  { id: "pet", prompt: "Pet" },
  { id: "fruit", prompt: "Fruit" },
  { id: "vegetable", prompt: "Vegetable" },
  { id: "food", prompt: "Something edible" },
  { id: "drink", prompt: "Drink" },
  { id: "dessert", prompt: "Dessert" },
  { id: "breakfast", prompt: "Breakfast food" },
  { id: "snack", prompt: "Snack" },
  { id: "meat", prompt: "Meat" },
  { id: "dairy", prompt: "Dairy product" },
  { id: "grain", prompt: "Grain" },
  { id: "seafood", prompt: "Seafood" },
  { id: "spice", prompt: "Spice or herb" },
  { id: "clothing", prompt: "Something you wear" },
  { id: "footwear", prompt: "Footwear" },
  { id: "headwear", prompt: "Headwear" },
  { id: "outerwear", prompt: "Outerwear" },
  { id: "accessory", prompt: "Accessory" },
  { id: "jewelry", prompt: "Jewelry" },
  { id: "furniture", prompt: "Furniture" },
  { id: "appliance", prompt: "Appliance" },
  { id: "kitchen_item", prompt: "Kitchen item" },
  { id: "cleaning_tool", prompt: "Cleaning tool" },
  { id: "room", prompt: "Room" },
  { id: "electronic", prompt: "Electronic device" },
  { id: "vehicle", prompt: "Vehicle" },
  { id: "beach_item", prompt: "Beach item" },
  { id: "luggage", prompt: "Luggage" },
  { id: "place", prompt: "Place" },
  { id: "city", prompt: "City" },
  { id: "country", prompt: "Country" },
  { id: "building", prompt: "Building" },
  { id: "store", prompt: "Store" },
  { id: "sport", prompt: "Sport" },
  { id: "sport_equipment", prompt: "Sports equipment" },
  { id: "toy", prompt: "Toy" },
  { id: "game", prompt: "Game" },
  { id: "musical_instrument", prompt: "Musical instrument" },
  { id: "weather", prompt: "Weather" },
  { id: "season", prompt: "Season" },
  { id: "job", prompt: "Job" },
  { id: "profession", prompt: "Profession" },
  { id: "activity", prompt: "Activity" },
  { id: "hobby", prompt: "Hobby" },
  { id: "action", prompt: "Action" },
  { id: "body_part", prompt: "Body part" },
  { id: "color", prompt: "Color" },
  { id: "shape", prompt: "Shape" },
  { id: "flies", prompt: "Something that can fly" },
];
