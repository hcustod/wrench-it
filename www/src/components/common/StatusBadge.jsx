import { LuBadgeCheck, LuClock } from 'react-icons/lu';

const STATUS_MAP = {
  verified: {
    label: 'Verified',
    className: 'wt-badge-verified',
    icon: LuBadgeCheck,
  },
  pending: {
    label: 'Pending',
    className: 'wt-badge-pending',
    icon: LuClock,
  },
  published: {
    label: 'Published',
    className: 'wt-badge-published',
    icon: LuBadgeCheck,
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const Icon = config.icon;

  return (
    <span className={config.className}>
      <Icon size={12} style={{ marginRight: 4 }} />
      {config.label}
    </span>
  );
}

