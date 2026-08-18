import React from 'react';
import { Link } from 'react-router-dom';
import './EmptyState.css';

// Reusable, visually-engaging empty state.
//   icon        – optional react-icon element (rendered large)
//   emoji       – optional emoji illustration (used when no icon is supplied)
//   title       – bold headline
//   message     – subtle supporting line
//   actionText  – optional CTA button label
//   actionLink  – route for the CTA (Link); if omitted, onAction is used
//   onAction    – optional click handler (when there's no route)
const EmptyState = ({
  icon,
  emoji,
  title,
  message,
  actionText,
  actionLink,
  onAction,
}) => (
  <div className="empty-state">
    <div className="empty-state__art" aria-hidden="true">
      {icon || (emoji ? <span className="empty-state__emoji">{emoji}</span> : null)}
    </div>
    {title ? <h3 className="empty-state__title">{title}</h3> : null}
    {message ? <p className="empty-state__message">{message}</p> : null}
    {actionText && actionLink ? (
      <Link to={actionLink} className="btn btn-primary empty-state__action">
        {actionText}
      </Link>
    ) : actionText && onAction ? (
      <button type="button" className="btn btn-primary empty-state__action" onClick={onAction}>
        {actionText}
      </button>
    ) : null}
  </div>
);

export default EmptyState;
