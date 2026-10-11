import { useMemo, useState } from "react";
import { ConsentNoticePanel } from "@neuro-cog-rehab/ui-components";

import {
  buildInformedConsentTemplate,
  createInformedConsentRecord,
  CURRENT_INFORMED_CONSENT_VERSION,
  getConsentRequirement,
  type InformedConsentRecord
} from "./informed-consent-model.js";

export interface InformedConsentPageProps {
  userId: string;
  existingRecord: InformedConsentRecord | null;
  onBackToHome: () => void;
  onConsentSaved: (record: InformedConsentRecord) => void;
}

export function InformedConsentPage(props: InformedConsentPageProps) {
  const template = useMemo(() => buildInformedConsentTemplate(), []);
  const requirement = useMemo(
    () =>
      getConsentRequirement(props.existingRecord, props.userId, CURRENT_INFORMED_CONSENT_VERSION),
    [props.existingRecord, props.userId]
  );
  const [accepted, setAccepted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = () => {
    try {
      const record = createInformedConsentRecord({
        userId: props.userId,
        protocolVersion: template.protocolVersion,
        accepted
      });
      setSaveError(null);
      props.onConsentSaved(record);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "同意记录保存失败，请稍后重试。");
    }
  };

  return (
    <main className="app-shell">
      <section className="consent-band" aria-labelledby="consent-title">
        <div className="consent-inner">
          <button className="text-button" type="button" onClick={props.onBackToHome}>
            返回今日首页
          </button>

          <header className="consent-header">
            <div>
              <p className="home-kicker">知情同意</p>
              <h1 id="consent-title">{template.title}</h1>
              <p className="home-subtitle">{template.subtitle}</p>
            </div>
            <div className="consent-version-card">
              <span>协议版本</span>
              <strong>{template.protocolVersion}</strong>
              <p>{requirementText(requirement.reason)}</p>
            </div>
          </header>

          <ConsentNoticePanel
            scopeNotice={template.scopeNotice}
            sections={template.sections}
            subtitle={template.subtitle}
            title={template.title}
            versionLabel={`协议版本 ${template.protocolVersion}`}
          />

          <section className="consent-confirm-panel" aria-labelledby="consent-confirm-title">
            <div>
              <p>监护人确认</p>
              <h2 id="consent-confirm-title">勾选后才能进入训练</h2>
              <span>系统会保存用户 ID、同意时间和协议版本号。若后续协议更新，需要重新确认。</span>
            </div>

            <label className="consent-checkbox">
              <input
                checked={accepted}
                type="checkbox"
                onChange={(event) => setAccepted(event.currentTarget.checked)}
              />
              <span>{template.checkboxLabel}</span>
            </label>

            {saveError ? (
              <p className="consent-error" role="alert">
                {saveError}
              </p>
            ) : null}

            <button
              className="primary-action"
              type="button"
              disabled={!accepted}
              onClick={handleSubmit}
            >
              {template.submitLabel}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}

function requirementText(reason: ReturnType<typeof getConsentRequirement>["reason"]): string {
  switch (reason) {
    case "missing":
      return "开始训练前需要监护人确认。";
    case "version_updated":
      return "协议版本已更新，需要重新阅读并确认。";
    case "user_mismatch":
      return "当前同意记录不属于本训练用户，需要重新确认。";
    case "current":
      return "当前版本已确认，可进入训练。";
  }
}
