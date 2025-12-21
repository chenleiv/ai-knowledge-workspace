import { type Theme } from "../hooks/useTheme";
import "./ThemeToggle.scss";

interface Props {
  value: Theme;
  onChange: (theme: Theme) => void;
}

export default function ThemeToggle({ value, onChange }: Props) {
  const isDark = value === "dark";

  return (
    <button
      type="button"
      className={`theme-switch ${isDark ? "dark" : "light"}`}
      onClick={() => onChange(isDark ? "light" : "dark")}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="track" />
      <span className="thumb">{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}
