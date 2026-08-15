import React from 'react';

// Unified Dot loading indicator.
//
// Reuses the existing Bootstrap spinner and the project's own `.app-loader` /
// `.section-state` / `.surface-card` classes so it matches the current visual
// language exactly — it introduces no new look. It also fixes an accessibility
// gap in the previous inline spinners, which set both `role="status"` and
// `aria-hidden="true"` on the same element (cancelling each other, so screen
// readers announced nothing). Here the status/live region is the visible
// container and the spinner itself is `aria-hidden`, with a visually-hidden
// Arabic label announced to assistive tech.
//
// variant:
//   'page'    – full-viewport centered loader (route/session bootstrap)
//   'section' – card/section placeholder loader (pass `card` for a surface-card)
//   'inline'  – small inline loader (buttons, dropdown panels)
const Loader = ({ variant = 'section', card = false, label = 'جاري التحميل', className = '' }) => {
  if (variant === 'inline') {
    return (
      <span role="status" aria-live="polite" className={className}>
        <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
        <span className="visually-hidden">{label}</span>
      </span>
    );
  }

  const wrapperClass =
    variant === 'page' ? 'app-loader' : `section-state${card ? ' surface-card' : ''}`;

  return (
    <div className={`${wrapperClass} ${className}`.trim()} role="status" aria-live="polite">
      <span className="spinner-border text-primary" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
};

export default Loader;
