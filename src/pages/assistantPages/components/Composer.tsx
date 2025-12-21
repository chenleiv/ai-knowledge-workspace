import { useEffect, useRef } from "react";

type Props = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function Composer({ value, disabled, onChange, onSend }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="composer">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask something..."
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend();
        }}
        disabled={disabled}
      />
      <button
        type="button"
        className="send-btn"
        onClick={onSend}
        disabled={disabled}
      >
        {disabled ? "Sending..." : "Send"}
      </button>
    </div>
  );
}
