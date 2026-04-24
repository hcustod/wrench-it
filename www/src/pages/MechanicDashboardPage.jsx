import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuBadgeCheck,
  LuClock,
  LuTrendingUp,
  LuStar,
  LuFileText,
} from 'react-icons/lu';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { getMechanicDashboard } from '../api/mechanic.js';

const EMPTY_STATS = {
  totalVerified: 0,
  thisWeek: 0,
  pendingVerifications: 0,
  pendingReviews: 0,
  reputation: 0,
};

export default function MechanicDashboardPage() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [recentlyVerified, setRecentlyVerified] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const data = await getMechanicDashboard();
        if (cancelled) return;
        setStats(data?.stats ?? EMPTY_STATS);
        setPendingVerifications(data?.pending ?? []);
        setRecentlyVerified(data?.recent ?? []);
        setError('');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load mechanic dashboard.');
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      
      <section className="mb-4">
        <div className="d-flex align-items-center gap-3 mb-1">
          <h1 className="mb-0">Mechanic Dashboard</h1>
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-4"
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'var(--wt-accent-bg-strong)',
              color: 'var(--wt-accent-soft)',
            }}
          >
            <LuBadgeCheck size={20} />
          </div>
        </div>
        <p className="wt-text-muted mb-0">
          Review receipt evidence attached to customer reviews to keep the platform trustworthy.
        </p>
        {error && (
          <p className="small mt-2 mb-0" style={{ color: 'var(--wt-accent-soft)' }}>
            {error}
          </p>
        )}
      </section>

      
      <section className="mb-4">
        <div className="row g-3 g-md-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuBadgeCheck}
              label="Total Verified"
              value={stats.totalVerified ?? 0}
              tone="accent"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuTrendingUp}
              label="This Week"
              value={stats.thisWeek ?? 0}
              tone="soft"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuClock}
              label="Pending Verifications"
              value={stats.pendingVerifications ?? stats.pendingReviews ?? 0}
              tone="default"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuStar}
              label="Reputation Score"
              value={`${(stats.reputation ?? 0).toFixed(1)} / 5.0`}
              tone="success"
            />
          </div>
        </div>
      </section>

      
      <section className="mb-4">
        <div className="wt-card">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-2">
            <div>
              <h2 className="h5 text-white mb-1">Pending Verifications</h2>
              <p className="wt-text-muted mb-0 small">
                {pendingVerifications.length} verification
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
                  backgroundColor: 'var(--wt-bg-surface-strong)',
                  border: '2px solid var(--wt-accent-border)',
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
                            backgroundColor: 'var(--wt-success-bg)',
                            color: 'var(--wt-success)',
                            borderRadius: 999,
                            border: '1px solid var(--wt-success-border)',
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
                      <span>Open Case</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {pendingVerifications.length === 0 && (
              <p className="wt-text-muted small mb-0">No pending verifications.</p>
            )}
          </div>
        </div>
      </section>

      
      <section>
        <div className="wt-card">
          <h2 className="h5 text-white mb-3">Recently Verified</h2>
          <div className="d-flex flex-column gap-3">
            {recentlyVerified.map((review) => (
              <div
                key={review.id}
                className="rounded-4 p-3 p-md-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
                style={{
                  backgroundColor: 'var(--wt-bg-surface-strong)',
                  border: '1px solid var(--wt-border-strong)',
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
                    backgroundColor: 'var(--wt-success-bg)',
                    color: 'var(--wt-success)',
                    borderRadius: 999,
                    border: '1px solid var(--wt-success-border)',
                  }}
                >
                  <LuBadgeCheck size={16} />
                  {review.action}
                </span>
              </div>
            ))}
            {recentlyVerified.length === 0 && (
              <p className="wt-text-muted small mb-0">No recent decisions yet.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
