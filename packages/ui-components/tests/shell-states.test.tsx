import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { APP_SHELL_CSS } from "../src/app-shell.css.js";
import {
  EEGDisconnectedState,
  EmptyReportState,
  EmptyTrainingState,
  ErrorState,
  LoadingState,
  PermissionDeniedState,
  SkeletonMedicalCard,
  SystemErrorState
} from "../src/shell-states.js";

const testDir = fileURLToPath(new URL(".", import.meta.url));
const sourceRoot = resolve(testDir, "../src");

describe("advanced shell state components", () => {
  it("renders all shared state components as reusable React elements", () => {
    [
      LoadingState({ title: "加载训练数据" }),
      SkeletonMedicalCard({ rows: 3 }),
      EmptyTrainingState({ actionLabel: "查看记录" }),
      EmptyReportState({ actionLabel: "返回报告中心" }),
      EEGDisconnectedState({ actionLabel: "检查设备" }),
      PermissionDeniedState({ actionLabel: "返回工作区" }),
      SystemErrorState({ actionLabel: "重试" }),
      ErrorState({ title: "系统暂时异常" })
    ].forEach((element) => {
      expect(isValidElement(element)).toBe(true);
    });
  });

  it("keeps state copy within auxiliary training and trend-tracking boundaries", () => {
    const source = readFileSync(resolve(sourceRoot, "shell-states.tsx"), "utf8");

    expect(source).not.toMatch(/确诊|治愈|疗效保证|治疗承诺|诊断结论/);
  });
});

describe("advanced shell state stylesheet", () => {
  it("contains medical loading, empty, permission, device, error, and skeleton states", () => {
    expect(APP_SHELL_CSS).toContain(".ncr-shell-state--loading");
    expect(APP_SHELL_CSS).toContain(".ncr-shell-state--training");
    expect(APP_SHELL_CSS).toContain(".ncr-shell-state--report");
    expect(APP_SHELL_CSS).toContain(".ncr-shell-state--device");
    expect(APP_SHELL_CSS).toContain(".ncr-shell-state--permission");
    expect(APP_SHELL_CSS).toContain(".ncr-shell-state--error");
    expect(APP_SHELL_CSS).toContain(".ncr-skeleton-medical-card");
  });

  it("uses slow, bounded motion and reduced-motion safeguards", () => {
    expect(APP_SHELL_CSS).toContain("ncr-shell-skeleton-scan");
    expect(APP_SHELL_CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(APP_SHELL_CSS).toContain("animation: none");
  });
});
