import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const testDir = fileURLToPath(new URL(".", import.meta.url));
const sourceRoot = resolve(testDir, "../src");

function readSource(relativePath: string): string {
  return readFileSync(resolve(sourceRoot, relativePath), "utf8");
}

describe("TrainingSessionShell unified training experience", () => {
  it("exports the shared training shell components required by training pages", () => {
    const source = readSource("training-session-shell.tsx");

    [
      "TrainingSessionShell",
      "TrainingTopBar",
      "TrainingFocusStage",
      "TrainingSideMonitor",
      "TrainingPauseOverlay",
      "TrainingCompleteOverlay",
      "EEGSafetyPrompt",
      "DifficultyBadge",
      "SessionProgressRing"
    ].forEach((componentName) => {
      expect(source).toContain(`export function ${componentName}`);
    });
  });

  it("keeps training shell motion bounded and compatible with reduced motion", () => {
    const styles = readSource("training-session-shell.css.ts");

    expect(styles).toContain('data-training-mode="true"');
    expect(styles).toContain("prefers-reduced-motion");
    expect(styles).toContain("animation: none");
    expect(styles).toContain("transition: none");
  });

  it("uses the shared shell across all core training pages", () => {
    [
      "music-therapy-training-page.tsx",
      "target-detection-game.tsx",
      "sustained-attention-task.tsx",
      "go-no-go-game.tsx",
      "stop-signal-task.tsx",
      "rhythm-navigation-game.tsx"
    ].forEach((relativePath) => {
      const source = readSource(relativePath);

      expect(source).toContain("TrainingSessionShell");
      expect(source).toContain("EEGSafetyPrompt");
    });
  });

  it("does not introduce clinical claim language in training shell copy", () => {
    const combined = [
      readSource("training-session-shell.tsx"),
      readSource("training-session-shell.css.ts")
    ].join("\n");

    expect(combined).not.toMatch(/确诊|治愈|疗效保证|治疗承诺/);
  });
});
