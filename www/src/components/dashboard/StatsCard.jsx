import React from 'react';

const TONE_STYLES = {
  default: {
    iconBg: 'var(--wt-accent-bg)',
    iconColor: 'var(--wt-accent)',
    borderColor: 'var(--wt-border-strong)',
  },
  accent: {
    iconBg: 'var(--wt-accent-bg-strong)',
    iconColor: 'var(--wt-accent-soft)',
    borderColor: 'var(--wt-accent-border)',
  },
  success: {
    iconBg: 'var(--wt-success-bg)',
    iconColor: 'var(--wt-success)',
    borderColor: 'var(--wt-success-border)',
  },
  danger: {
    iconBg: 'var(--wt-danger-bg)',
    iconColor: 'var(--wt-danger)',
    borderColor: 'var(--wt-danger-border)',
  },
  soft: {
    iconBg: 'var(--wt-info-bg)',
    iconColor: 'var(--wt-info)',
    borderColor: 'var(--wt-info-border)',
  },
};

export default function StatsCard({ icon: Icon, label, value, tone = 'default', helper }) {
  const colors = TONE_STYLES[tone] ?? TONE_STYLES.default;

  return (
    <div
      className="wt-card h-100"
      style={{
        borderColor: colors.borderColor,
      }}
    >
      <div className="d-flex flex-column gap-2">
        <div className="d-flex align-items-center gap-3">
          {Icon && (
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-4"
              style={{
                width: 40,
                height: 40,
                backgroundColor: colors.iconBg,
                color: colors.iconColor,
              }}
            >
              <Icon size={18} />
            </div>
          )}
          <span className="small wt-text-muted">{label}</span>
        </div>
        <div>
          <div className="h4 mb-0 text-white">{value}</div>
          {helper && (
            <div className="small" style={{ color: 'var(--wt-info)' }}>
              {helper}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
