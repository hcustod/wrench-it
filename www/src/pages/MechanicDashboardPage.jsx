import { Link } from 'react-router-dom';
import {
  LuBadgeCheck,
  LuClock,
  LuTrendingUp,
  LuStar,
  LuFileText,
} from 'react-icons/lu';
import {
  mockPendingVerifications,
  mockRecentVerified,
} from '../data/mockData.js';
import StatsCard from '../components/dashboard/StatsCard.jsx';

function getPendingVerifications() {
  return mockPendingVerifications;
}

function getRecentlyVerified() {
  return mockRecentVerified;
}

function getMechanicStats(pending) {
  return {
    totalVerified: 247,
    thisWeek: 18,
    pendingReviews: pending.length,
    reputation: 4.9,
  };
}

export default function MechanicDashboardPage() {
  const pendingVerifications = getPendingVerifications();
  const recentlyVerified = getRecentlyVerified();
  const stats = getMechanicStats(pendingVerifications);

  return (
    <>
      {/* Header */}
      <section className="mb-4">
        <div className="d-flex align-items-center gap-3 mb-1">
          <h1 className="mb-0">Mechanic Dashboard</h1>
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-4"
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'rgba(255,140,66,0.18)',
              color: '#FF8C42',
            }}
          >
            <LuBadgeCheck size={20} />
          </div>
        </div>
        <p className="wt-text-muted mb-0">
          Review and verify customer reviews to keep the community trusted.
        </p>
      </section>

      {/* Stats grid */}
      <section className="mb-4">
        <div className="row g-3 g-md-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuBadgeCheck}
              label="Total Verified"
              value={stats.totalVerified}
              tone="accent"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuTrendingUp}
              label="This Week"
              value={stats.thisWeek}
              tone="soft"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuClock}
              label="Pending Reviews"
              value={stats.pendingReviews}
              tone="default"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuStar}
              label="Reputation Score"
              value={`${stats.reputation.toFixed(1)} / 5.0`}
              tone="success"
            />
          </div>
        </div>
      </section>

      {/* Pending verifications */}
      <section className="mb-4">
        <div className="wt-card">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-2">
            <div>
              <h2 className="h5 text-white mb-1">Pending Verifications</h2>
              <p className="wt-text-muted mb-0 small">
                {pendingVerifications.length} review
                {pendingVerifications.length === 1 ? '' : 's'} waiting for your decision.
              </p>
            </div>
          </div>

          <div className="d-flex flex-column gap-3">
            {pendingVerifications.map((review) => (
              <div
                key={review.id}
                className="rounded-4 p-3 p-md-4"
                style={{
                  backgroundColor: '#2A2740',
                  border: '2px solid rgba(255,140,66,0.6)',
                }}
              >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                  <div className="flex-grow-1">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                      <h3 className="h6 text-white mb-0">{review.shopName}</h3>
                      {review.hasReceipt && (
                        <span
                          className="badge text-uppercase"
                          style={{
                            backgroundColor: 'rgba(22,163,74,0.15)',
                            color: '#22c55e',
                            borderRadius: 999,
                            border: '1px solid rgba(22,163,74,0.6)',
                          }}
                        >
                          Has receipt
                        </span>
                      )}
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2 small wt-text-muted">
                      <span>Customer: {review.customerName}</span>
                      <span>•</span>
                      <span>Service: {review.service}</span>
                      <span>•</span>
                      <span>{review.date}</span>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-start justify-content-md-end">
                    <Link
                      to={`/verify-review/${review.id}`}
                      className="btn btn-wt-primary d-flex align-items-center gap-2"
                    >
                      <LuFileText size={16} />
                      <span>Review</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recently verified */}
      <section>
        <div className="wt-card">
          <h2 className="h5 text-white mb-3">Recently Verified</h2>
          <div className="d-flex flex-column gap-3">
            {recentlyVerified.map((review) => (
              <div
                key={review.id}
                className="rounded-4 p-3 p-md-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
                style={{
                  backgroundColor: '#2A2740',
                  border: '1px solid #3A3652',
                }}
              >
                <div>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <span className="text-white">{review.shopName}</span>
                    <span className="wt-text-muted small">•</span>
                    <span className="wt-text-muted small">{review.customerName}</span>
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2 small wt-text-muted">
                    <span>{review.service}</span>
                    <span>•</span>
                    <span>{review.date}</span>
                  </div>
                </div>
                <span
                  className="badge d-inline-flex align-items-center gap-1"
                  style={{
                    backgroundColor: 'rgba(22,163,74,0.15)',
                    color: '#22c55e',
                    borderRadius: 999,
                    border: '1px solid rgba(22,163,74,0.6)',
                  }}
                >
                  <LuBadgeCheck size={16} />
                  {review.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

