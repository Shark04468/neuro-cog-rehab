import type { ReactNode } from "react";

export interface MainWorkspaceProps {
  children: ReactNode;
}

export function MainWorkspace({ children }: MainWorkspaceProps): JSX.Element {
  return (
    <section className="ncr-main-workspace" aria-label="医疗工作空间">
      <div className="ncr-main-workspace__surface">{children}</div>
    </section>
  );
}
