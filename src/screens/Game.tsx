import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/useGame";
import { AnswerInput } from "../components/AnswerInput";
import { AlphabetBank } from "../components/AlphabetBank";
import { Preview } from "../components/Preview";
import { PromptCard } from "../components/PromptCard";

export default function Game() {
  const {
    app,
    submitWord,
    buildPreview,
    openIds,
    burnedSet,
    quitGame,
    score,
    categories,
  } = useGame();
  const game = app.game;
  if (!game) return null;

  const [inputValue, setInputValue] = useState("");
  const [burning, setBurning] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const clearedCount = game.prompts.filter((p) => p.cleared).length;

  const preview = buildPreview(inputValue);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    submitWord(trimmed);
    setInputValue("");
    // mark newly burned letters for animation
    const next = buildPreview(trimmed);
    setBurning(next.burns.map((b) => b.toUpperCase()));
  };

  const handleLetterPress = (letter: string) => {
    setInputValue((v) => (v + letter).toLowerCase());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const promptEls = game.prompts.map((p) => {
    const cat = categories.find((c) => c.id === p.id);
    return (
      <PromptCard
        key={p.id}
        id={p.id}
        prompt={cat?.prompt ?? p.id}
        cleared={p.cleared}
        word={p.word}
      />
    );
  });

  return (
    <div className="screen surface min-h-screen">
      <div className="p-3">
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="text-muted text-sm">Puzzle #{game.number}</div>
            <div className="font-display text-xl">
              {clearedCount} / 5 cleared
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted text-sm">Borrows left</div>
            <div className="font-display text-xl text-ember">
              {game.borrowsLeft}
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted text-sm">Score</div>
            <div className="font-display text-xl">{score}</div>
          </div>
        </div>

        {app.message && (
          <p className="text-warn mb-3 text-sm">{app.message}</p>
        )}

        <div className="mb-3">{promptEls}</div>

        <AnswerInput
          value={inputValue}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Type a word"
        />
        <Preview preview={preview} openCount={game.prompts.filter((p) => !p.cleared).length} />

        <div className="mt-4">
          <div className="text-muted text-sm mb-2">Alphabet</div>
          <AlphabetBank
            burned={burnedSet}
            burning={burning}
            onLetterPress={handleLetterPress}
          />
        </div>

        <div className="mt-3">
          <button
            type="button"
            className="button button-text focus-ring"
            onClick={quitGame}
          >
            I'm done
          </button>
        </div>
      </div>
    </div>
  );
}
