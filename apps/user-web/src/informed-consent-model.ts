export const CURRENT_INFORMED_CONSENT_VERSION = "guardian-consent-2026-06-v1";

export type InformedConsentSectionId =
  | "system_purpose"
  | "non_diagnostic_boundary"
  | "training_data_collection"
  | "eeg_data_collection"
  | "data_use_scope"
  | "retention_and_deletion"
  | "minor_guardian_consent"
  | "discomfort_handling"
  | "contact_placeholder";

export type ConsentRequirementReason = "missing" | "version_updated" | "user_mismatch" | "current";

export interface InformedConsentSection {
  /** Stable section id for rendering and future protocol diffing. */
  id: InformedConsentSectionId;
  title: string;
  body: string;
  bullets: string[];
}

export interface InformedConsentTemplate {
  protocolVersion: string;
  title: string;
  subtitle: string;
  sections: InformedConsentSection[];
  checkboxLabel: string;
  submitLabel: string;
  scopeNotice: string;
}

export interface InformedConsentRecord {
  /** Client-generated record id; backend can replace it with a database id. */
  id: string;
  /** Training user id covered by this consent. */
  userId: string;
  /** Optional guardian account id when available. */
  guardianUserId?: string;
  /** Protocol version accepted by the guardian. */
  consentVersion: string;
  /** ISO timestamp when the guardian accepted this version. */
  consentedAt: string;
  /** Role expected to confirm consent for a minor user. */
  acceptedByRole: "guardian";
  /** Sensitive marker used by persistence and audit layers. */
  dataSensitivity: "sensitive";
  /** Section ids included in the accepted protocol version. */
  acceptedSectionIds: InformedConsentSectionId[];
}

export interface CreateInformedConsentRecordInput {
  userId: string;
  guardianUserId?: string;
  protocolVersion?: string;
  accepted: boolean;
  acceptedAt?: string;
}

export interface ConsentRequirement {
  requiresConsent: boolean;
  reason: ConsentRequirementReason;
  expectedVersion: string;
  existingVersion: string | null;
}

export class InformedConsentModelError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InformedConsentModelError";
  }
}

export function buildInformedConsentTemplate(
  protocolVersion = CURRENT_INFORMED_CONSENT_VERSION
): InformedConsentTemplate {
  return {
    protocolVersion,
    title: "训练前知情同意",
    subtitle: "请监护人阅读后确认。本页内容用于说明训练用途、数据采集和退出方式。",
    scopeNotice: "系统用于辅助训练、状态评估、训练记录和趋势查看，不提供确定性健康结论。",
    checkboxLabel:
      "我已阅读并理解以上内容，同意孩子在监护人授权下使用本系统进行辅助训练，并同意按上述范围处理训练相关数据。",
    submitLabel: "同意并进入训练",
    sections: [
      {
        id: "system_purpose",
        title: "1. 系统用途说明",
        body: "本系统用于辅助认知训练、训练状态评估、训练记录和阶段趋势查看。",
        bullets: [
          "训练内容包括音乐放松、注意力任务、点击反应任务和节律导航任务。",
          "训练安排可由治疗师配置，训练过程中可以随时暂停。"
        ]
      },
      {
        id: "non_diagnostic_boundary",
        title: "2. 非诊断、非治疗替代说明",
        body: "本系统不用于疾病判断，不替代医生、治疗师或其他专业人员的线下评估与建议。",
        bullets: [
          "页面中的分数和趋势只用于训练回顾。",
          "系统不会给出确切健康结论，也不会承诺固定结果。"
        ]
      },
      {
        id: "training_data_collection",
        title: "3. 训练数据采集说明",
        body: "系统会记录训练过程中与任务完成相关的数据，用于生成训练记录和趋势回顾。",
        bullets: [
          "可能记录训练时间、完成状态、正确率、漏按、误按、反应时和暂停事件。",
          "这些数据会按敏感训练数据处理，仅授权角色可查看。"
        ]
      },
      {
        id: "eeg_data_collection",
        title: "4. EEG 数据采集说明",
        body: "如使用头戴设备，系统会记录设备连接状态和简化后的状态参考指标。",
        bullets: [
          "系统主要展示注意、放松、疲劳趋势和信号稳定情况。",
          "如果设备未连接，可使用模拟数据或跳过相关训练状态参考。"
        ]
      },
      {
        id: "data_use_scope",
        title: "5. 数据使用范围",
        body: "数据仅用于训练安排、训练记录、趋势分析、家长反馈和治疗师端报告。",
        bullets: [
          "未经授权，不向无关人员展示个人训练数据。",
          "后台管理只处理必要的账号、权限和安全审计信息。"
        ]
      },
      {
        id: "retention_and_deletion",
        title: "6. 数据保存与删除说明",
        body: "训练记录会按机构配置保存，用于后续查看趋势。监护人可通过机构流程申请查看、更正或删除。",
        bullets: [
          "删除申请处理前，系统可能需要保留必要的操作日志用于安全审计。",
          "导出数据时应按敏感数据处理，避免转发给无关人员。"
        ]
      },
      {
        id: "minor_guardian_consent",
        title: "7. 未成年人监护人同意",
        body: "首期训练对象包含儿童青少年，开始训练前需要监护人确认知情同意。",
        bullets: [
          "监护人确认后，系统会保存用户 ID、同意时间和协议版本号。",
          "如果协议版本更新，需要重新阅读并确认。"
        ]
      },
      {
        id: "discomfort_handling",
        title: "8. 不适情况处理建议",
        body: "训练中如出现不适，应先暂停训练并休息，必要时联系监护人、治疗师或其他专业人员。",
        bullets: [
          "如出现头痛、明显眩晕、烦躁、疲劳升高或设备佩戴不适，请停止当前训练。",
          "系统会记录暂停或中断事件，供后续训练安排参考。"
        ]
      },
      {
        id: "contact_placeholder",
        title: "9. 联系方式占位",
        body: "如需咨询数据使用、训练安排或同意撤回流程，请联系所在机构。",
        bullets: ["机构联系人：待填写", "联系电话：待填写", "邮箱：待填写"]
      }
    ]
  };
}

export function createInformedConsentRecord(
  input: CreateInformedConsentRecordInput
): InformedConsentRecord {
  validateCreateInput(input);

  const protocolVersion = input.protocolVersion ?? CURRENT_INFORMED_CONSENT_VERSION;
  const acceptedAt = input.acceptedAt ?? new Date().toISOString();
  const template = buildInformedConsentTemplate(protocolVersion);
  const sanitizedUserId = sanitizeId(input.userId);
  const record: InformedConsentRecord = {
    id: `consent-${sanitizedUserId}-${protocolVersion}-${Date.parse(acceptedAt)}`,
    userId: sanitizedUserId,
    consentVersion: protocolVersion,
    consentedAt: acceptedAt,
    acceptedByRole: "guardian",
    dataSensitivity: "sensitive",
    acceptedSectionIds: template.sections.map((section) => section.id)
  };

  if (input.guardianUserId !== undefined) {
    record.guardianUserId = sanitizeId(input.guardianUserId);
  }

  return record;
}

export function getConsentRequirement(
  record: InformedConsentRecord | null,
  userId: string,
  expectedVersion = CURRENT_INFORMED_CONSENT_VERSION
): ConsentRequirement {
  if (!record) {
    return {
      requiresConsent: true,
      reason: "missing",
      expectedVersion,
      existingVersion: null
    };
  }
  if (record.userId !== sanitizeId(userId)) {
    return {
      requiresConsent: true,
      reason: "user_mismatch",
      expectedVersion,
      existingVersion: record.consentVersion
    };
  }
  if (record.consentVersion !== expectedVersion) {
    return {
      requiresConsent: true,
      reason: "version_updated",
      expectedVersion,
      existingVersion: record.consentVersion
    };
  }

  return {
    requiresConsent: false,
    reason: "current",
    expectedVersion,
    existingVersion: record.consentVersion
  };
}

export function canEnterTrainingWithConsent(
  record: InformedConsentRecord | null,
  userId: string,
  expectedVersion = CURRENT_INFORMED_CONSENT_VERSION
): boolean {
  return !getConsentRequirement(record, userId, expectedVersion).requiresConsent;
}

function validateCreateInput(input: CreateInformedConsentRecordInput): void {
  if (!input.accepted) {
    throw new InformedConsentModelError("Consent checkbox must be accepted before training.");
  }
  requireNonEmpty(input.userId, "userId is required.");
  if (input.guardianUserId !== undefined) {
    requireNonEmpty(input.guardianUserId, "guardianUserId cannot be empty.");
  }
  if (input.protocolVersion !== undefined) {
    requireNonEmpty(input.protocolVersion, "protocolVersion cannot be empty.");
  }
  if (input.acceptedAt !== undefined && Number.isNaN(Date.parse(input.acceptedAt))) {
    throw new InformedConsentModelError("acceptedAt must be a valid ISO timestamp.");
  }
}

function requireNonEmpty(value: string, message: string): void {
  if (value.trim().length === 0) {
    throw new InformedConsentModelError(message);
  }
}

function sanitizeId(value: string): string {
  return value.trim();
}
