import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { APP_SHELL_CSS } from "../src/app-shell.css.js";

const ROLE_BASED_SIDEBAR_SOURCE = readFileSync(
  new URL("../src/role-based-sidebar.tsx", import.meta.url),
  "utf8"
);
const MUSIC_LIBRARY_PAGE_SOURCE = readFileSync(
  new URL("../src/music-library-page.tsx", import.meta.url),
  "utf8"
);

describe("app shell visual workspace system", () => {
  it("contains unified medical workspace shell classes", () => {
    expect(APP_SHELL_CSS).toContain(".ncr-shell-topbar__system");
    expect(APP_SHELL_CSS).toContain(".ncr-system-status-cluster");
    expect(APP_SHELL_CSS).toContain(".ncr-main-workspace");
    expect(APP_SHELL_CSS).toContain(".ncr-page-header");
  });

  it("contains sidebar collapse and system footer styling", () => {
    expect(APP_SHELL_CSS).toContain(".ncr-shell-sidebar__collapse");
    expect(APP_SHELL_CSS).toContain(".ncr-shell-sidebar__system");
    expect(APP_SHELL_CSS).toContain('[data-collapsed="true"]');
  });

  it("contains advanced loading, empty, and error state styling with reduced motion support", () => {
    expect(APP_SHELL_CSS).toContain(".ncr-shell-state--loading");
    expect(APP_SHELL_CSS).toContain(".ncr-shell-state--empty");
    expect(APP_SHELL_CSS).toContain(".ncr-shell-state--error");
    expect(APP_SHELL_CSS).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("contains demo mode visual affordances without replacing formal permission styling", () => {
    expect(APP_SHELL_CSS).toContain(".ncr-shell-sidebar__demo");
    expect(APP_SHELL_CSS).toContain(".ncr-system-status-pill");
  });

  it("marks sidebar items with stable route paths for navigation verification", () => {
    expect(ROLE_BASED_SIDEBAR_SOURCE).toContain("data-path={props.item.path}");
    expect(ROLE_BASED_SIDEBAR_SOURCE).toContain("props.onNavigate(props.item.path)");
  });

  it("keeps the shared music library page accessible with a page-level heading", () => {
    expect(MUSIC_LIBRARY_PAGE_SOURCE).toContain("<h1>选择适合本次辅助训练的音乐</h1>");
    expect(MUSIC_LIBRARY_PAGE_SOURCE).toContain(".ncr-music-library__header h1");
  });
});
