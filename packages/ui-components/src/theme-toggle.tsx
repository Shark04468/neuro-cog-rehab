import type { NeuroThemeMode } from "./design-system-tokens.js";

export interface ThemeToggleProps {
  theme: NeuroThemeMode;
  onThemeChange: (theme: NeuroThemeMode) => void;
}

export function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps): JSX.Element {
  const nextTheme: NeuroThemeMode = theme === "hospital-light" ? "neuro-dark" : "hospital-light";

  return (
    <button
      aria-label="切换浅色或深色模式"
      className="ncr-shell-theme-toggle"
      onClick={() => onThemeChange(nextTheme)}
      type="button"
    >
      {theme === "hospital-light" ? "浅色" : "深色"}
    </button>
  );
}
