import React from 'react';

const TONE_STYLES = {
  default: {
    iconBg: 'rgba(108,99,255,0.15)',
    iconColor: '#6C63FF',
    borderColor: '#3A3652',
  },
  accent: {
    iconBg: 'rgba(255,140,66,0.18)',
    iconColor: '#FF8C42',
    borderColor: 'rgba(255,140,66,0.6)',
  },
  success: {
    iconBg: 'rgba(22,163,74,0.18)',
    iconColor: '#16a34a',
    borderColor: 'rgba(22,163,74,0.6)',
  },
  danger: {
    iconBg: 'rgba(239,68,68,0.18)',
    iconColor: '#ef4444',
    borderColor: 'rgba(239,68,68,0.6)',
  },
  soft: {
    iconBg: 'rgba(166,153,255,0.18)',
    iconColor: '#A699FF',
    borderColor: 'rgba(166,153,255,0.6)',
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
            <div className="small" style={{ color: '#7DD3FC' }}>
              {helper}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

