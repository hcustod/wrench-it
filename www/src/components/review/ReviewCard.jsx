import { LuBadgeCheck, LuCircleAlert, LuClock3, LuStar } from 'react-icons/lu';

const VERIFICATION_CONFIG = {
  VERIFIED: {
    label: 'Receipt verified',
    className: 'wt-badge-verified',
    Icon: LuBadgeCheck,
  },
  PENDING: {
    label: 'Receipt under review',
    className: 'wt-badge-pending',
    Icon: LuClock3,
  },
  REJECTED: {
    label: 'Receipt not verified',
    className: 'wt-badge-rejected',
    Icon: LuCircleAlert,
  },
};

export default function ReviewCard({
  reviewerName,
  rating,
  reviewText,
  ownerResponse,
  ownerResponseBy,
  verificationStatus,
  date,
}) {
  // Round for display so half-step math from APIs does not produce awkward star fills in the card UI.
  const fullStars = Math.round(rating ?? 0);
  const verification = VERIFICATION_CONFIG[verificationStatus] ?? null;
  const VerificationIcon = verification?.Icon;

  return (
    <div className="wt-card">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="text-white">{reviewerName}</span>
            {verification && VerificationIcon && (
              <span className={verification.className}>
                <VerificationIcon size={12} style={{ marginRight: 4 }} />
                {verification.label}
              </span>
            )}
          </div>
          <span className="wt-text-muted small">{date}</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          {Array.from({ length: 5 }).map((_, idx) => (
            <LuStar
              key={idx}
              size={16}
              className={idx < fullStars ? '' : 'wt-text-muted'}
              style={
                idx < fullStars
                  ? { color: 'var(--wt-warning)', fill: 'var(--wt-warning)' }
                  : { color: 'var(--wt-border-strong)' }
              }
            />
          ))}
        </div>
      </div>
      <p className="wt-text-muted mb-0">{reviewText}</p>
      {ownerResponse && (
        <div
          className="rounded-4 p-3 mt-3"
          style={{
            backgroundColor: 'var(--wt-accent-bg)',
            border: '1px solid var(--wt-accent-border)',
          }}
        >
          <p className="text-white small mb-1">
            {ownerResponseBy || 'Shop Owner'} response
          </p>
          <p className="wt-text-muted small mb-0">{ownerResponse}</p>
        </div>
      )}
    </div>
  );
}
