import { useEffect, useMemo, useState } from "react";

import { NeuroButton } from "./design-system.js";
import {
  createEmptyRegisterFlowInput,
  getRegisterFlowSteps,
  mockSubmitRegisterFlow,
  RegisterFlowError,
  validateRegisterFlowStep,
  type RegisterFlowInput,
  type RegisterFlowSubmitClient,
  type RegisterFlowSubmitResult
} from "./register-flow-model.js";
import { RoleBasedRegisterForm } from "./role-based-register-form.js";
import { StepProgress } from "./step-progress.js";
import { SuccessState } from "./success-state.js";
import type { AuthPortalRole, AuthValidationIssue } from "./unified-auth-types.js";

export interface RegisterFlowProps {
  selectedRole: AuthPortalRole | null;
  onRequestLogin: () => void;
  submitClient?: RegisterFlowSubmitClient | undefined;
  onEnterDashboard?: ((path: string) => void) | undefined;
  onRegisterSuccess?:
    | ((result: RegisterFlowSubmitResult, input: RegisterFlowInput) => void)
    | undefined;
}

export function RegisterFlow({
  selectedRole,
  onRequestLogin,
  submitClient = mockSubmitRegisterFlow,
  onEnterDashboard,
  onRegisterSuccess
}: RegisterFlowProps): JSX.Element {
  const [input, setInput] = useState<RegisterFlowInput>(() =>
    createEmptyRegisterFlowInput(selectedRole)
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [issues, setIssues] = useState<AuthValidationIssue[]>([]);
  const [submitResult, setSubmitResult] = useState<RegisterFlowSubmitResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setInput(createEmptyRegisterFlowInput(selectedRole));
    setStepIndex(0);
    setIssues([]);
    setSubmitResult(null);
  }, [selectedRole]);

  const steps = useMemo(() => getRegisterFlowSteps(input.role), [input.role]);
  const currentStep = steps[stepIndex] ?? steps[0] ?? null;

  if (submitResult) {
    return (
      <SuccessState
        result={submitResult}
        onBackToLogin={onRequestLogin}
        onEnterDashboard={(path) => {
          if (onEnterDashboard) {
            onEnterDashboard(path);
            return;
          }

          if (typeof window !== "undefined") {
            window.location.assign(path);
          }
        }}
      />
    );
  }

  if (!input.role || !currentStep) {
    return (
      <section className="ncr-register-flow">
        <div className="ncr-auth-hint" role="status">
          请先选择注册身份，系统会展示对应的分步注册表单。
        </div>
      </section>
    );
  }

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = async () => {
    const nextIssues = validateRegisterFlowStep(input, currentStep.id);
    if (nextIssues.length > 0) {
      setIssues(nextIssues);
      return;
    }

    setIssues([]);
    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitClient(input);
      setSubmitResult(result);
      onRegisterSuccess?.(result, input);
    } catch (error) {
      if (error instanceof RegisterFlowError) {
        setIssues(error.issues);
      } else {
        setIssues([{ field: "submit", message: "注册提交暂时无法完成，请稍后重试。" }]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="ncr-register-flow">
      <StepProgress currentStepId={currentStep.id} steps={steps} />
      <RoleBasedRegisterForm
        input={input}
        issues={issues}
        onChange={(patch) => setInput((current) => ({ ...current, ...patch }))}
        step={currentStep}
      />
      <div className="ncr-register-actions">
        <NeuroButton
          disabled={isFirstStep || isSubmitting}
          onClick={() => setStepIndex((current) => current - 1)}
          type="button"
          variant="ghost"
        >
          返回上一步
        </NeuroButton>
        <NeuroButton disabled={isSubmitting} onClick={handleNext} type="button">
          {isSubmitting ? "正在提交..." : isLastStep ? "提交注册" : "下一步"}
        </NeuroButton>
      </div>
      <button className="ncr-auth-link" onClick={onRequestLogin} type="button">
        已有账号，返回登录
      </button>
    </section>
  );
}
