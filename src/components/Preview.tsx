export type PreviewProps = {
  preview: {
    recognized: boolean;
    display?: string;
    cleared: string[];
    burns: string[];
    borrows: string[];
    borrowCount: number;
    penalty: number;
    reason?: "nomatch" | "toomanyborrows";
  } | null;
  openCount: number;
};

export function Preview({ preview, openCount }: PreviewProps) {
  if (!preview) return null;
  if (!preview.recognized) {
    return <p className="preview warn">We don't have that word yet.</p>;
  }
  if (preview.reason === "nomatch") {
    return <p className="preview warn">That doesn't fit anything left.</p>;
  }
  if (preview.reason === "toomanyborrows") {
    return (
      <p className="preview warn">
        Too many borrowed letters ({preview.borrowCount} needed, you have {openCount ? "some" : "none"} left).
      </p>
    );
  }
  const lines: string[] = [];
  if (preview.cleared.length > 0) {
    lines.push(`Clears: ${preview.cleared.join(", ")}`);
  }
  if (preview.burns.length > 0) {
    lines.push(`Burns: ${preview.burns.join(", ").toUpperCase()}`);
  }
  if (preview.borrows.length > 0) {
    lines.push(`Borrows ${preview.borrows.join(", ").toUpperCase()} −${preview.penalty}`);
  }
  return (
    <div className="preview">
      {lines.map((l, i) => (
        <p key={i} className="preview-line">{l}</p>
      ))}
    </div>
  );
}
