export interface DynamicMedicalBackgroundProps {
  className?: string;
  /**
   * Training mode keeps the visual language present but reduces movement and
   * scan effects for attention-sensitive tasks.
   */
  trainingMode?: boolean | undefined;
}

export function DynamicMedicalBackground({
  className,
  trainingMode = false
}: DynamicMedicalBackgroundProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={["ncr-medical-bg", className].filter(Boolean).join(" ")}
      data-training-mode={String(trainingMode)}
    >
      <div className="ncr-medical-bg__base" />
      <div className="ncr-medical-bg__eeg" />
      <div className="ncr-medical-bg__grid" />
      <div className="ncr-medical-bg__network" />
      <div className="ncr-medical-bg__wave" />
      <div className="ncr-medical-bg__scan" />
      <div className="ncr-medical-bg__focus" />
    </div>
  );
}
