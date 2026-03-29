import { LuBadgeCheck, LuCircleAlert, LuClock } from 'react-icons/lu';

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
  rejected: {
    label: 'Rejected',
    className: 'wt-badge-rejected',
    icon: LuCircleAlert,
  },
  published: {
    label: 'Published',
    className: 'wt-badge-published',
    icon: LuBadgeCheck,
  },
  requested: {
    label: 'Requested',
    className: 'wt-badge-pending',
    icon: LuClock,
  },
  confirmed: {
    label: 'Confirmed',
    className: 'wt-badge-published',
    icon: LuBadgeCheck,
  },
  in_progress: {
    label: 'In Progress',
    className: 'wt-badge-pending',
    icon: LuClock,
  },
  completed: {
    label: 'Completed',
    className: 'wt-badge-verified',
    icon: LuBadgeCheck,
  },
  declined: {
    label: 'Declined',
    className: 'wt-badge-rejected',
    icon: LuCircleAlert,
  },
  canceled: {
    label: 'Canceled',
    className: 'wt-badge-rejected',
    icon: LuCircleAlert,
  },
  approved: {
    label: 'Approved',
    className: 'wt-badge-verified',
    icon: LuBadgeCheck,
  },
};

export default function StatusBadge({ status }) {
  const normalized =
    typeof status === 'string'
      ? status.trim().toLowerCase().replace(/[\s-]+/g, '_')
      : '';
  const config = STATUS_MAP[normalized] ?? STATUS_MAP.pending;
  const Icon = config.icon;

  return (
    <span className={config.className}>
      <Icon size={12} style={{ marginRight: 4 }} />
      {config.label}
    </span>
  );
}
