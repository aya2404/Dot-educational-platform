import React from 'react';

// Reusable summary card for dashboards. Reuses the existing `.metric-card`
// visual language; `trend` (optional) is a short qualifier under the value.
const StatsCard = ({ icon, value, label, trend }) => (
  <article className="metric-card">
    {icon ? <span className="metric-card__icon">{icon}</span> : null}
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
      {trend ? (
        <span style={{ fontSize: '0.72rem', color: 'var(--dj-text-muted)' }}>{trend}</span>
      ) : null}
    </div>
  </article>
);

export default StatsCard;
