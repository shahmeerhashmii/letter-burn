import type { LetterState } from "./LetterTile";
import { LetterTile } from "./LetterTile";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export type AlphabetBankProps = {
  burned: Set<string>;
  burning: string[];
  onLetterPress?: (letter: string) => void;
};

export function AlphabetBank({ burned, burning, onLetterPress }: AlphabetBankProps) {
  return (
    <div role="grid" aria-label="Alphabet bank" className="alphabet">
      {ALPHABET.map((letter, index) => {
        const state: LetterState = burned.has(letter.toLowerCase())
          ? "burned"
          : "available";
        const isBurning = burning.includes(letter);
        return (
          <button
            key={letter}
            type="button"
            className="tile-focus"
            onClick={() => onLetterPress?.(letter)}
            aria-pressed={burned.has(letter.toLowerCase())}
          >
            <LetterTile
              letter={letter}
              state={state}
              burning={isBurning}
              delayMs={isBurning ? index * 40 : undefined}
            />
          </button>
        );
      })}
    </div>
  );
}
