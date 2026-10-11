import { NeuroButton, NeuroTag } from "./design-system.js";
import type { RegisterFlowSubmitResult } from "./register-flow-model.js";

export interface SuccessStateProps {
  result: RegisterFlowSubmitResult;
  onBackToLogin: () => void;
  onEnterDashboard: (path: string) => void;
}

export function SuccessState({
  result,
  onBackToLogin,
  onEnterDashboard
}: SuccessStateProps): JSX.Element {
  return (
    <section className="ncr-success-state" aria-labelledby="register-success-title">
      <div className="ncr-success-state__mark" aria-hidden="true">
        ✓
      </div>
      <NeuroTag tone="monitoring">注册信息已提交</NeuroTag>
      <h2 id="register-success-title">已完成注册流程</h2>
      <p>系统已保存本次注册信息。当前使用演示提交流程，后续可替换为真实注册接口与审核流程。</p>
      <dl>
        <div>
          <dt>注册编号</dt>
          <dd>{result.registrationId}</dd>
        </div>
        <div>
          <dt>目标空间</dt>
          <dd>{result.dashboardPath}</dd>
        </div>
      </dl>
      <div className="ncr-register-actions">
        <NeuroButton type="button" onClick={onBackToLogin}>
          返回登录
        </NeuroButton>
        <NeuroButton
          type="button"
          variant="secondary"
          onClick={() => onEnterDashboard(result.dashboardPath)}
        >
          进入对应空间
        </NeuroButton>
      </div>
    </section>
  );
}
