import { useGame } from "../state/useGame";

export default function Practice({ onClose }: { onClose: () => void }) {
  const { app, goHome } = useGame();
  return (
    <div className="screen surface min-h-screen">
      <div className="p-3">
        <h2 className="font-display text-2xl mb-2">Practice</h2>
        <p className="text-muted mb-4">
          Unlimited random puzzles. Practice never touches your streak or history.
        </p>
        <button
          type="button"
          className="button button-primary focus-ring mb-4"
          onClick={() => {
            // placeholder: start a practice puzzle
          }}
        >
          Start practice puzzle
        </button>
        <button
          type="button"
          className="button button-text focus-ring"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
