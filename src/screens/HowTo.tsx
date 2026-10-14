import { useGame } from "../state/useGame";

export default function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="screen surface min-h-screen">
      <div className="p-3">
        <h2 className="font-display text-2xl mb-2">How to play</h2>
        <ol className="mb-4">
          <li>Type a word. It can clear any open prompt it fits.</li>
          <li>Each distinct letter you use burns out of your alphabet.</li>
          <li>One word can clear two or three prompts at once (Double or Triple Duty).</li>
          <li>Reusing a burned letter borrows it for −8 points.</li>
        </ol>
        <p className="text-sm text-muted">
          Example: FISH clears "animal" and "food" and burns F, I, S, H.
        </p>
        <button
          type="button"
          className="button button-text focus-ring mt-4"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
