export type AnswerInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (word: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function AnswerInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Type a word",
}: AnswerInputProps) {
  return (
    <div className="flex flex-column gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit(value);
        }}
        disabled={disabled}
        placeholder={placeholder}
        className="input"
        autoCapitalize="none"
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
