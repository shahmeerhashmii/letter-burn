export type LetterState = "available" | "burned" | "saved";

export type LetterTileProps = {
  letter: string;
  state: LetterState;
  burning?: boolean;
  delayMs?: number;
};

export function LetterTile({ letter, state, burning, delayMs }: LetterTileProps) {
  const isBurned = state === "burned";
  const isBurning = burning && isBurned;
  return (
    <span
      role="gridcell"
      aria-label={`${letter}, ${isBurned ? "burned" : "available"}`}
      className={`tile ${state} ${isBurning ? "burning" : ""}`}
      style={{
        "--burn-duration": isBurning ? "0.45s" : undefined,
        animationDelay: isBurning && delayMs != null ? `${delayMs}ms` : undefined,
      }}
    >
      {isBurned ? (
        <span className="char">{letter}</span>
      ) : (
        letter
      )}
    </span>
  );
}
