import { useGame } from "../state/useGame";

export default function History() {
  const { app, goHome } = useGame();
  const history = app.stored.history;
  return (
    <div className="screen surface min-h-screen">
      <div className="p-3">
        <h2 className="font-display text-2xl mb-2">Past results</h2>
        {history.length === 0 ? (
          <p className="text-muted">No past results yet.</p>
        ) : (
          <ul>
            {history.map((r, i) => (
              <li key={i} className="mb-2">
                Puzzle #{r.number} · {r.date} · {r.score} · {r.unburned} saved
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="button button-text focus-ring mt-4"
          onClick={goHome}
        >
          Home
        </button>
      </div>
    </div>
  );
}
