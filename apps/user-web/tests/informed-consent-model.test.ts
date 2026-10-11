import { describe, expect, it } from "vitest";

import {
  buildInformedConsentTemplate,
  canEnterTrainingWithConsent,
  createInformedConsentRecord,
  CURRENT_INFORMED_CONSENT_VERSION,
  getConsentRequirement,
  InformedConsentModelError
} from "../src/informed-consent-model.js";

describe("informed-consent-model", () => {
  it("builds the required consent sections with a version", () => {
    const template = buildInformedConsentTemplate();

    expect(template.protocolVersion).toBe(CURRENT_INFORMED_CONSENT_VERSION);
    expect(template.sections.map((section) => section.id)).toEqual([
      "system_purpose",
      "non_diagnostic_boundary",
      "training_data_collection",
      "eeg_data_collection",
      "data_use_scope",
      "retention_and_deletion",
      "minor_guardian_consent",
      "discomfort_handling",
      "contact_placeholder"
    ]);
    expect(template.checkboxLabel).toContain("我已阅读并理解");
    expect(
      template.sections.find((section) => section.id === "contact_placeholder")?.bullets
    ).toContain("机构联系人：待填写");
  });

  it("creates a sensitive consent record with user id, version, and time", () => {
    const record = createInformedConsentRecord({
      userId: " trainee-demo-001 ",
      guardianUserId: " guardian-demo-001 ",
      accepted: true,
      acceptedAt: "2026-06-16T11:00:00.000Z"
    });

    expect(record.userId).toBe("trainee-demo-001");
    expect(record.guardianUserId).toBe("guardian-demo-001");
    expect(record.consentVersion).toBe(CURRENT_INFORMED_CONSENT_VERSION);
    expect(record.consentedAt).toBe("2026-06-16T11:00:00.000Z");
    expect(record.acceptedByRole).toBe("guardian");
    expect(record.dataSensitivity).toBe("sensitive");
    expect(record.acceptedSectionIds).toContain("eeg_data_collection");
  });

  it("requires checkbox acceptance before creating a record", () => {
    expect(() =>
      createInformedConsentRecord({
        userId: "trainee-demo-001",
        accepted: false
      })
    ).toThrow(InformedConsentModelError);
  });

  it("blocks training when consent is missing or the version changed", () => {
    const record = createInformedConsentRecord({
      userId: "trainee-demo-001",
      accepted: true,
      acceptedAt: "2026-06-16T11:00:00.000Z"
    });

    expect(canEnterTrainingWithConsent(null, "trainee-demo-001")).toBe(false);
    expect(canEnterTrainingWithConsent(record, "trainee-demo-001")).toBe(true);
    expect(canEnterTrainingWithConsent(record, "other-user")).toBe(false);
    expect(canEnterTrainingWithConsent(record, "trainee-demo-001", "future-version")).toBe(false);
    expect(getConsentRequirement(record, "trainee-demo-001", "future-version").reason).toBe(
      "version_updated"
    );
  });

  it("keeps wording clear without cure or guaranteed-result claims", () => {
    const text = JSON.stringify(buildInformedConsentTemplate());

    for (const restrictedTerm of ["确诊", "治愈", "疗效保证", "疗效确定"]) {
      expect(text).not.toContain(restrictedTerm);
    }
    expect(text).toContain("辅助认知训练");
    expect(text).toContain("未成年人监护人同意");
    expect(text).toContain("协议版本更新");
  });
});
