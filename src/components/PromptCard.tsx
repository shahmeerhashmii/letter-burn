export type PromptCardProps = {
  id: string;
  prompt: string;
  cleared: boolean;
  word?: string;
};

export function PromptCard({ id, prompt, cleared, word }: PromptCardProps) {
  return (
    <div
      role="row"
      className={`prompt-card ${cleared ? "cleared" : ""}`}
      aria-roledescription={cleared ? "cleared prompt" : "open prompt"}
    >
      <span className="prompt-text">{prompt}</span>
      {cleared ? (
        <span className="prompt-word">
          <span className="prompt-check">✓</span>{" "}
          {word}
        </span>
      ) : null}
    </div>
  );
}
