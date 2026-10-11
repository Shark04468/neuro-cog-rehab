import type { AuthPortalRole } from "./unified-auth-types.js";

export type WorkspaceBaseUrls = Partial<Record<AuthPortalRole, string>>;

/**
 * Default local development workspaces. These values only select the frontend
 * shell for each role; access control still belongs to the auth/API layer.
 */
export const DEFAULT_LOCAL_WORKSPACE_BASE_URLS: Readonly<Record<AuthPortalRole, string>> = {
  trainee: "http://127.0.0.1:5173",
  parent: "http://127.0.0.1:5173",
  therapist: "http://127.0.0.1:5186",
  org_admin: "http://127.0.0.1:5176"
};

export function createLocalWorkspaceBaseUrls(overrides: WorkspaceBaseUrls = {}): WorkspaceBaseUrls {
  return {
    ...DEFAULT_LOCAL_WORKSPACE_BASE_URLS,
    ...overrides
  };
}

export interface WorkspaceNavigationOptions {
  baseUrls?: WorkspaceBaseUrls | undefined;
  currentOrigin?: string | undefined;
}

export interface WorkspaceNavigationTarget {
  path: string;
  role: AuthPortalRole | null;
  href: string;
  isExternalWorkspace: boolean;
}

const WORKSPACE_PATH_PREFIXES: ReadonlyArray<readonly [AuthPortalRole, string]> = [
  ["trainee", "/trainee"],
  ["parent", "/parent"],
  ["therapist", "/therapist"],
  ["org_admin", "/admin"]
];

/**
 * Keeps role-to-workspace routing explicit. The function only maps application
 * workspaces; authorization still belongs to the auth/API layer.
 */
export function resolveRoleForWorkspacePath(path: string): AuthPortalRole | null {
  const normalizedPath = normalizeWorkspacePath(path);
  const match = WORKSPACE_PATH_PREFIXES.find(
    ([, prefix]) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );

  return match?.[0] ?? null;
}

export function resolveWorkspaceNavigationTarget(
  path: string,
  options: WorkspaceNavigationOptions = {}
): WorkspaceNavigationTarget {
  const normalizedPath = normalizeWorkspacePath(path);
  const role = resolveRoleForWorkspacePath(normalizedPath);
  const currentOrigin = trimTrailingSlash(options.currentOrigin ?? getCurrentOrigin());
  const baseUrl = role ? options.baseUrls?.[role] : undefined;
  const href = baseUrl ? `${trimTrailingSlash(baseUrl)}${normalizedPath}` : normalizedPath;
  const isExternalWorkspace = Boolean(
    baseUrl && currentOrigin && trimTrailingSlash(baseUrl) !== currentOrigin
  );

  return {
    path: normalizedPath,
    role,
    href,
    isExternalWorkspace
  };
}

export function normalizeWorkspacePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.pathname}${url.search}${url.hash}` || "/";
    } catch {
      return "/";
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function getCurrentOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
