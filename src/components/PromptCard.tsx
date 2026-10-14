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
      className={`card p-3 mb-2 ${cleared ? "text-ok" : ""}`}
      aria-roledescription={cleared ? "cleared prompt" : "open prompt"}
    >
      <span className="mr-2">{prompt}</span>
      {cleared ? (
        <span className="ml-auto text-sm text-muted">✓ {word}</span>
      ) : null}
    </div>
  );
}
