import { useState } from "react";

import type { AppShellNotification } from "./app-shell-types.js";

export interface NotificationCenterProps {
  notifications: readonly AppShellNotification[];
}

export function NotificationCenter({ notifications }: NotificationCenterProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="ncr-shell-notifications">
      <button
        aria-expanded={open}
        aria-label="打开通知中心"
        className="ncr-shell-icon-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        N
        {unreadCount > 0 ? (
          <span className="ncr-shell-notifications__count">{unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <section className="ncr-shell-notifications__panel" role="dialog">
          <header className="ncr-shell-notifications__header">
            <strong>通知中心</strong>
            <span>{notifications.length} 条</span>
          </header>
          <div className="ncr-shell-notifications__list">
            {notifications.length === 0 ? (
              <article className="ncr-shell-notifications__item">
                <strong>暂无新通知</strong>
                <p>当前没有需要处理的训练提醒。</p>
              </article>
            ) : (
              notifications.map((notification) => (
                <article
                  className="ncr-shell-notifications__item"
                  data-level={notification.level}
                  key={notification.id}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.createdAtLabel}</span>
                  <p>{notification.message}</p>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
