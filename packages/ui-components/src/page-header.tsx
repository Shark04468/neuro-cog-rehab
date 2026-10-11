import type { ReactNode } from "react";

export interface PageHeaderProps {
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta
}: PageHeaderProps): JSX.Element {
  return (
    <header className="ncr-page-header">
      <div>
        {eyebrow ? <p className="ncr-page-header__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="ncr-page-header__description">{description}</p> : null}
        {meta ? <div className="ncr-page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="ncr-page-header__actions">{actions}</div> : null}
    </header>
  );
}
