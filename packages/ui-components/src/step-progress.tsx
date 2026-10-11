import type { RegisterFlowStep, RegisterFlowStepId } from "./register-flow-model.js";

export interface StepProgressProps {
  steps: RegisterFlowStep[];
  currentStepId: RegisterFlowStepId;
}

export function StepProgress({ steps, currentStepId }: StepProgressProps): JSX.Element {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentStepId)
  );
  const progressPercent =
    steps.length <= 1 ? 0 : Math.round((currentIndex / (steps.length - 1)) * 100);

  return (
    <div className="ncr-step-progress" aria-label="注册步骤进度">
      <div className="ncr-step-progress__track" aria-hidden="true">
        <span style={{ width: `${progressPercent}%` }} />
      </div>
      <ol className="ncr-step-progress__list">
        {steps.map((step, index) => {
          const status =
            index < currentIndex ? "done" : index === currentIndex ? "active" : "pending";

          return (
            <li className="ncr-step-progress__item" data-status={status} key={step.id}>
              <span>{index + 1}</span>
              <strong>{step.title}</strong>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
