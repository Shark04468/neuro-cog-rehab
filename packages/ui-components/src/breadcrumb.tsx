import type { AppShellBreadcrumbItem } from "./app-shell-types.js";

export interface BreadcrumbProps {
  items: readonly AppShellBreadcrumbItem[];
  onNavigate?: (path: string) => void;
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps): JSX.Element {
  return (
    <nav aria-label="路径导航" className="ncr-shell-breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const content =
          item.path && !isLast ? (
            <a
              href={item.path}
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.(item.path ?? "/");
              }}
            >
              {item.label}
            </a>
          ) : (
            <span className={isLast ? "ncr-shell-breadcrumb__current" : undefined}>
              {item.label}
            </span>
          );

        return (
          <span key={`${item.label}-${item.path ?? index}`}>
            {content}
            {!isLast ? <span className="ncr-shell-breadcrumb__separator">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
