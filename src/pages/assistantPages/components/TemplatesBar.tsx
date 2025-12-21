type TemplateKind = "summarize" | "actions" | "interview";

type Props = {
  onApply: (kind: TemplateKind) => void;
  onClear: () => void;
};

export default function TemplatesBar({ onApply, onClear }: Props) {
  return (
    <div className="assistant-topbar">
      <div className="templates">
        <button
          type="button"
          className="secondary-btn"
          onClick={() => onApply("summarize")}
        >
          Summarize
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => onApply("actions")}
        >
          Action items
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => onApply("interview")}
        >
          Interview Qs
        </button>
      </div>

      <button type="button" className="secondary-btn" onClick={onClear}>
        Clear chat
      </button>
    </div>
  );
}
