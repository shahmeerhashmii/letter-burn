import { useGame } from "../state/useGame";
import { config } from "../config";
import { localDateString } from "../engine/daily";

export default function Home() {
  const { app, setScreen, startGame } = useGame();
  const today = localDateString();

  return (
    <div className="screen surface min-h-screen">
      <div className="p-4">
        <h1 className="font-display text-3xl mb-1">{config.name}</h1>
        <p className="text-muted mb-4">{config.tagline}</p>
        <p className="text-muted mb-4">
          {today} · Puzzle #{"---"}
        </p>
        <div className="mb-4">
          <span className="font-display text-xl">Streak: {app.stored.streak.current}</span>
        </div>
        <button
          type="button"
          className="button button-primary focus-ring mb-4 block w-full"
          onClick={() => startGame(today)}
        >
          Play
        </button>
        <div className="gap-2 mb-4">
          <a
            href="#"
            className="text-ember text-sm focus-ring"
            onClick={(e) => {
              e.preventDefault();
              setScreen("howto");
            }}
          >
            How to play
          </a>
          <a
            href="#"
            className="text-ember text-sm focus-ring"
            onClick={(e) => {
              e.preventDefault();
              setScreen("practice");
            }}
          >
            Practice
          </a>
        </div>
      </div>
    </div>
  );
}
