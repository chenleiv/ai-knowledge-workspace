type Props = {
  onApply: (kind: "summarize" | "actions" | "interview") => void;
};

export default function TemplatesBar({ onApply }: Props) {
  return (
    <div className="templates">
      <button
        type="button"
        className="template-btn"
        onClick={() => onApply("summarize")}
      >
        Summarize
      </button>

      <button
        type="button"
        className="template-btn"
        onClick={() => onApply("actions")}
      >
        Action items
      </button>

      <button
        type="button"
        className="template-btn"
        onClick={() => onApply("interview")}
      >
        Interview Qs
      </button>
    </div>
  );
}