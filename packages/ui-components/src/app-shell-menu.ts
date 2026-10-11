import type { NeuroTone } from "./design-system-tokens.js";
import { isAuthPortalRole } from "./unified-auth-model.js";
import type { AppShellBreadcrumbItem, AppShellMenuItem, AppShellRole } from "./app-shell-types.js";
import { AppShellError } from "./app-shell-types.js";

export const APP_SHELL_ROLE_LABELS: Record<AppShellRole, string> = {
  trainee: "训练用户",
  parent: "家长/监护人",
  therapist: "治疗师",
  org_admin: "机构管理员"
};

export const APP_SHELL_ROLE_TONES: Record<AppShellRole, NeuroTone> = {
  trainee: "clinical",
  parent: "calm",
  therapist: "monitoring",
  org_admin: "primary"
};

export const APP_SHELL_MENU_CONFIG: Record<AppShellRole, readonly AppShellMenuItem[]> = {
  trainee: [
    shellMenu(
      "trainee-dashboard",
      "今日训练",
      "查看今日辅助训练任务",
      "/trainee/dashboard",
      ["trainee"],
      { icon: "pulse" }
    ),
    shellMenu(
      "trainee-music",
      "音乐疗愈",
      "进入音乐放松与状态观察",
      "/trainee/music",
      ["trainee"],
      {
        icon: "music"
      }
    ),
    shellMenu(
      "trainee-attention",
      "注意力训练",
      "进行目标探测和持续注意练习",
      "/trainee/attention",
      ["trainee"],
      { icon: "focus" }
    ),
    shellMenu(
      "trainee-reaction",
      "点击反应",
      "进行 Go/No-Go 点击反应练习",
      "/trainee/reaction",
      ["trainee"],
      { icon: "target" }
    ),
    shellMenu(
      "trainee-rhythm",
      "节律导航",
      "进行节奏同步与路线记忆练习",
      "/trainee/rhythm",
      ["trainee"],
      { icon: "route" }
    ),
    shellMenu(
      "trainee-reports",
      "我的报告",
      "查看训练记录与趋势反馈",
      "/trainee/reports",
      ["trainee"],
      { icon: "report" }
    ),
    shellMenu(
      "trainee-device",
      "设备状态",
      "查看 EEG 连接与佩戴提示",
      "/trainee/device",
      ["trainee"],
      { icon: "device" }
    ),
    shellMenu(
      "trainee-settings",
      "设置",
      "管理训练偏好与账号设置",
      "/trainee/settings",
      ["trainee"],
      { icon: "settings" }
    )
  ],
  parent: [
    shellMenu("parent-dashboard", "训练概览", "查看本周训练概况", "/parent/dashboard", ["parent"], {
      icon: "overview"
    }),
    shellMenu(
      "parent-weekly-brief",
      "每周简报",
      "阅读通俗版阶段反馈",
      "/parent/weekly-brief",
      ["parent"],
      { icon: "brief" }
    ),
    shellMenu("parent-records", "训练记录", "查看训练完成记录", "/parent/records", ["parent"], {
      icon: "record"
    }),
    shellMenu("parent-advice", "治疗师建议", "查看辅助训练建议", "/parent/advice", ["parent"], {
      icon: "note"
    }),
    shellMenu("parent-risk", "风险提醒", "查看训练安全提示", "/parent/risk", ["parent"], {
      icon: "shield",
      tone: "warning"
    }),
    shellMenu("parent-settings", "账号设置", "管理账号和通知设置", "/parent/settings", ["parent"], {
      icon: "settings"
    })
  ],
  therapist: [
    shellMenu(
      "therapist-dashboard",
      "工作台",
      "查看今日训练与异常提醒",
      "/therapist/dashboard",
      ["therapist"],
      { icon: "dashboard" }
    ),
    shellMenu(
      "therapist-users",
      "用户管理",
      "管理绑定训练用户",
      "/therapist/users",
      ["therapist"],
      {
        icon: "users"
      }
    ),
    shellMenu(
      "therapist-prescriptions",
      "训练处方",
      "配置训练模块和强度",
      "/therapist/prescriptions",
      ["therapist"],
      { icon: "prescription" }
    ),
    shellMenu(
      "therapist-live-monitoring",
      "实时训练监测",
      "查看授权训练会话状态",
      "/therapist/live-monitoring",
      ["therapist"],
      { icon: "monitor" }
    ),
    shellMenu(
      "therapist-reports",
      "报告中心",
      "生成训练报告和周报",
      "/therapist/reports",
      ["therapist"],
      { icon: "report" }
    ),
    shellMenu(
      "therapist-music",
      "音乐库",
      "维护音乐素材与推荐",
      "/therapist/music-library",
      ["therapist"],
      { icon: "music" }
    ),
    shellMenu(
      "therapist-export",
      "数据导出",
      "导出脱敏训练摘要",
      "/therapist/data-export",
      ["therapist"],
      { icon: "export" }
    ),
    shellMenu(
      "therapist-settings",
      "设置",
      "管理个人工作台偏好",
      "/therapist/settings",
      ["therapist"],
      { icon: "settings" }
    )
  ],
  org_admin: [
    shellMenu(
      "admin-dashboard",
      "机构概览",
      "查看机构训练运行概况",
      "/admin/dashboard",
      ["org_admin"],
      { icon: "building" }
    ),
    shellMenu(
      "admin-therapists",
      "治疗师管理",
      "管理机构治疗师账号",
      "/admin/therapists",
      ["org_admin"],
      { icon: "clinician" }
    ),
    shellMenu("admin-users", "用户管理", "管理机构授权用户", "/admin/users", ["org_admin"], {
      icon: "users"
    }),
    shellMenu("admin-devices", "设备管理", "查看机构设备状态", "/admin/devices", ["org_admin"], {
      icon: "device"
    }),
    shellMenu(
      "admin-statistics",
      "数据统计",
      "查看脱敏汇总趋势",
      "/admin/statistics",
      ["org_admin"],
      { icon: "chart" }
    ),
    shellMenu("admin-logs", "操作日志", "查看系统操作记录", "/admin/logs", ["org_admin"], {
      icon: "log"
    }),
    shellMenu(
      "admin-permissions",
      "权限设置",
      "维护机构角色权限",
      "/admin/permissions",
      ["org_admin"],
      { icon: "lock" }
    )
  ]
};

export function getAppShellRoleLabel(role: AppShellRole): string {
  return APP_SHELL_ROLE_LABELS[ensureAppShellRole(role)];
}

export function getAppShellRoleTone(role: AppShellRole): NeuroTone {
  return APP_SHELL_ROLE_TONES[ensureAppShellRole(role)];
}

export function getAppShellMenuItems(role: AppShellRole): readonly AppShellMenuItem[] {
  return APP_SHELL_MENU_CONFIG[ensureAppShellRole(role)];
}

export function getDefaultAppShellPath(role: AppShellRole): string {
  const firstItem = getAppShellMenuItems(role)[0];
  if (!firstItem) {
    throw new AppShellError(`No app shell menu configured for role ${role}.`);
  }

  return firstItem.path;
}

export function findAppShellMenuItem(role: AppShellRole, path: string): AppShellMenuItem | null {
  return (
    getAppShellMenuItems(role).find(
      (item) => item.path === path || path.startsWith(`${item.path}/`)
    ) ?? null
  );
}

export function isAppShellPathAllowed(role: AppShellRole, path: string): boolean {
  return findAppShellMenuItem(role, path) !== null;
}

export function resolveAppShellActivePath(role: AppShellRole, path: string): string {
  return isAppShellPathAllowed(role, path) ? path : getDefaultAppShellPath(role);
}

export function buildAppShellBreadcrumbs(
  role: AppShellRole,
  path: string
): AppShellBreadcrumbItem[] {
  const resolvedRole = ensureAppShellRole(role);
  const activeItem = findAppShellMenuItem(resolvedRole, path);
  const rootLabel = getAppShellRoleLabel(resolvedRole);

  if (!activeItem) {
    return [{ label: rootLabel, path: getDefaultAppShellPath(resolvedRole) }];
  }

  return [
    { label: rootLabel, path: getDefaultAppShellPath(resolvedRole) },
    { label: activeItem.label, path: activeItem.path }
  ];
}

export function ensureAppShellRole(role: AppShellRole): AppShellRole {
  if (!isAuthPortalRole(role)) {
    throw new AppShellError(`Unsupported app shell role: ${String(role)}.`);
  }

  return role;
}

function shellMenu(
  id: string,
  label: string,
  description: string,
  path: string,
  roles: readonly AppShellRole[],
  options: Pick<AppShellMenuItem, "icon" | "tone" | "badgeLabel"> = {}
): AppShellMenuItem {
  return {
    id,
    label,
    description,
    path,
    roles,
    ...options
  };
}
