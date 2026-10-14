export type ShareButtonProps = {
  text: string;
};

export function ShareButton({ text }: ShareButtonProps) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable
    }
  }
  return (
    <button type="button" className="button button-text focus-ring" onClick={copy}>
      Share
    </button>
  );
}
