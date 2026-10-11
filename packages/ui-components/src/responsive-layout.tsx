import type { ReactNode } from "react";

export interface ResponsiveLayoutProps {
  background: ReactNode;
  sidebar: ReactNode;
  topBar: ReactNode;
  breadcrumb: ReactNode;
  children: ReactNode;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export function ResponsiveLayout({
  background,
  sidebar,
  topBar,
  breadcrumb,
  children,
  sidebarOpen,
  onCloseSidebar
}: ResponsiveLayoutProps): JSX.Element {
  return (
    <div className="ncr-shell">
      {background}
      <div className="ncr-shell__layout">
        {sidebar}
        {sidebarOpen ? (
          <button
            aria-label="关闭侧边栏菜单"
            className="ncr-shell__overlay"
            onClick={onCloseSidebar}
            type="button"
          />
        ) : null}
        <div className="ncr-shell__content-frame">
          <div className="ncr-shell__main">
            {topBar}
            {breadcrumb}
            <section className="ncr-shell__content">{children}</section>
          </div>
        </div>
      </div>
    </div>
  );
}
