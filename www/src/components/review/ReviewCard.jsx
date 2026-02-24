import { LuStar, LuBadgeCheck } from 'react-icons/lu';

export default function ReviewCard({
  reviewerName,
  rating,
  reviewText,
  isVerified = false,
  isMechanicReview = false,
  date,
}) {
  const fullStars = Math.round(rating ?? 0);

  return (
    <div className="wt-card">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="text-white">{reviewerName}</span>
            {isVerified && (
              <LuBadgeCheck size={18} style={{ color: '#6C63FF' }} />
            )}
            {isMechanicReview && (
              <span className="wt-chip-service">Verified Mechanic</span>
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
                  ? { color: '#6C63FF', fill: '#6C63FF' }
                  : { color: '#3A3652' }
              }
            />
          ))}
        </div>
      </div>
      <p className="wt-text-muted mb-0">{reviewText}</p>
    </div>
  );
}

