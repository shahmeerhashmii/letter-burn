import type { LetterState } from "./LetterTile";
import { LetterTile } from "./LetterTile";

export type AlphabetBankProps = {
  burned: Set<string>;
  burning: string[];
  onLetterPress?: (letter: string) => void;
};

export function AlphabetBank({ burned, burning, onLetterPress }: AlphabetBankProps) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return (
    <div role="grid" aria-label="Alphabet bank" className="alphabet">
      {letters.map((letter) => {
        const state: LetterState = burned.has(letter.toLowerCase())
          ? "burned"
          : "available";
        return (
          <button
            key={letter}
            type="button"
            className="tile-focus"
            onClick={() => onLetterPress?.(letter)}
            aria-pressed={burned.has(letter.toLowerCase())}
          >
            <LetterTile letter={letter} state={state} burning={burning.includes(letter)} />
          </button>
        );
      })}
    </div>
  );
}
