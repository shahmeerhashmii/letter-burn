export type LetterState = "available" | "burned" | "saved";

export type LetterTileProps = {
  letter: string;
  state: LetterState;
  burning?: boolean;
};

export function LetterTile({ letter, state, burning }: LetterTileProps) {
  const isBurned = state === "burned";
  return (
    <span
      role="gridcell"
      aria-label={`${letter}, ${isBurned ? "burned" : "available"}`}
      className={`tile ${state} ${burning && isBurned ? "burning" : ""}`}
    >
      {isBurned ? (
        <span className="char">{letter}</span>
      ) : (
        letter
      )}
    </span>
  );
}
