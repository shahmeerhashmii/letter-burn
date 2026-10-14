import { useGame } from "../state/useGame";
import { config } from "../config";
import puzzles from "../data/puzzles.json";
import { ShareButton } from "../components/ShareButton";
import { localDateString } from "../engine/daily";

export default function Results() {
  const { app, goHome } = useGame();
  const history = app.stored.history;
  const latest = history[0];
  if (!latest) return <div>No results.</div>;

  const puzzle = (puzzles as Record<string, { number: number; prompts: string[]; par?: number }>)[
    latest.date
  ];
  const par = puzzle?.par;

  const burnedCount = 26 - latest.unburned;
  const doubleDuties = 0; // computed from words in stage 6; placeholder here

  const shareRows = shareText(latest.number, latest.score, burnedCount);

  return (
    <div className="screen surface min-h-screen">
      <div className="p-3">
        <h2 className="font-display text-2xl mb-2">Results</h2>
        <p className="text-muted mb-4">
          Puzzle #{latest.number} · {localDateString(new Date(latest.date + "T00:00:00"))}
        </p>
        <div className="mb-4">
          <div className="font-display text-xl">
            Score {latest.score}
          </div>
          <p className="text-sm text-muted">
            {latest.cleared}/5 prompts · {latest.unburned} letters saved ·
            {latest.borrows} borrowed
          </p>
          {par != null && (
            <p className="text-sm text-muted">
              Today's best possible: {par}. You got {latest.score}.
            </p>
          )}
        </div>
        <div className="mb-4">
          <h3 className="text-sm text-muted mb-2">Words used</h3>
          <div className="mb-2">{shareRows.words}</div>
        </div>
        <div className="mb-4">
          <ShareButton text={shareRows.share} />
        </div>
        <div className="mb-4">
          <button type="button" className="button button-text focus-ring" onClick={goHome}>
            Home
          </button>
          <button
            type="button"
            className="button button-text focus-ring ml-2"
            onClick={() => {
              // navigate to history handled by parent; placeholder
            }}
          >
            Past results
          </button>
        </div>
      </div>
    </div>
  );
}

function shareText(
  number: number,
  score: number,
  burnedCount: number,
): { words: string; share: string } {
  const saved = 26 - burnedCount;
  const row1 = "ABCDEFGHIJKLM".split("");
  const row2 = "NOPQRSTUVWXYZ".split("");
  const squares = (letters: string[]) =>
    letters.map(() => "⬛").join("");
  const share = [
    `Letter Burn #${number} · ${score}`,
    squares(row1),
    squares(row2),
    `5/5 · ${saved} saved · 0 borrowed`,
    config.url,
  ].filter(Boolean).join("\n");
  return { words: "", share };
}
