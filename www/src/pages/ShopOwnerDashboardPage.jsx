import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuStar,
  LuTrendingUp,
  LuMessageSquare,
  LuSettings2,
  LuDollarSign,
} from 'react-icons/lu';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { getMyShopDashboard } from '../api/shop.js';

const EMPTY_SHOP_PROFILE = {
  name: 'Your Shop',
  rating: 0,
  reviewCount: 0,
  location: 'Unknown location',
  phone: '-',
};

const EMPTY_STATS = {
  averageRating: 0,
  totalReviews: 0,
  monthlyViews: 0,
  activeServices: 0,
};

export default function ShopOwnerDashboardPage() {
  const [shopProfile, setShopProfile] = useState(EMPTY_SHOP_PROFILE);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [topServices, setTopServices] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const data = await getMyShopDashboard();
        if (cancelled) return;

        setShopProfile(data?.shopProfile ?? EMPTY_SHOP_PROFILE);
        setStats(data?.stats ?? EMPTY_STATS);
        setTopServices(data?.topServices ?? []);
        setRecentReviews(data?.recentReviews ?? []);
        setError('');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load shop dashboard.');
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Header */}
      <section className="mb-4">
        <h1 className="mb-1">Shop Dashboard</h1>
        <p className="wt-text-muted mb-0">
          Manage your shop profile, services, and customer reviews.
        </p>
        {error && (
          <p className="small mt-2 mb-0" style={{ color: '#FF8C42' }}>
            {error}
          </p>
        )}
      </section>

      {/* Stats grid */}
      <section className="mb-4">
        <div className="row g-3 g-md-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuStar}
              label="Average Rating"
              value={`${Number(stats.averageRating ?? 0).toFixed(1)} / 5.0`}
              tone="accent"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuMessageSquare}
              label="Total Reviews"
              value={stats.totalReviews ?? 0}
              tone="soft"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuTrendingUp}
              label="Monthly Views"
              value={Number(stats.monthlyViews ?? 0).toLocaleString()}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuDollarSign}
              label="Active Services"
              value={stats.activeServices ?? 0}
              tone="default"
            />
          </div>
        </div>
      </section>

      {/* Main two-column layout */}
      <section>
        <div className="row g-4">
          {/* Left column */}
          <div className="col-12 col-lg-8 d-flex flex-column gap-4">
            {/* Shop profile */}
            <div className="wt-card">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
                <div>
                  <h2 className="h5 text-white mb-1">Shop Profile</h2>
                  <p className="wt-text-muted small mb-0">
                    This is what drivers see on your public profile.
                  </p>
                </div>
                <Link
                  to="/manage-shop"
                  className="btn btn-wt-outline d-inline-flex align-items-center gap-2"
                >
                  <LuSettings2 size={16} />
                  <span>Edit info</span>
                </Link>
              </div>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-opacity-25 border-secondary">
                  <span className="wt-text-muted small">Shop name</span>
                  <span className="text-white">{shopProfile.name ?? '-'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-opacity-25 border-secondary">
                  <span className="wt-text-muted small">Rating</span>
                  <div className="d-flex align-items-center gap-2">
                    <LuStar size={16} style={{ color: '#FF8C42', fill: '#FF8C42' }} />
                    <span className="text-white">{Number(shopProfile.rating ?? 0).toFixed(1)}</span>
                    <span className="wt-text-muted small">
                      ({shopProfile.reviewCount ?? 0} reviews)
                    </span>
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-opacity-25 border-secondary">
                  <span className="wt-text-muted small">Location</span>
                  <span className="text-white">{shopProfile.location ?? '-'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-2">
                  <span className="wt-text-muted small">Phone</span>
                  <span className="text-white">{shopProfile.phone ?? '-'}</span>
                </div>
              </div>
            </div>

            {/* Services & pricing */}
            <div className="wt-card">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
                <div>
                  <h2 className="h5 text-white mb-1">Services &amp; pricing</h2>
                  <p className="wt-text-muted small mb-0">
                    Keep your menu up to date so drivers know what you offer.
                  </p>
                </div>
                <Link
                  to="/manage-services"
                  className="btn btn-wt-primary d-inline-flex align-items-center gap-2"
                >
                  <LuSettings2 size={16} />
                  <span>Manage services</span>
                </Link>
              </div>

              <div className="d-flex flex-column gap-3">
                {topServices.map((service) => (
                  <div
                    key={service.name}
                    className="rounded-4 p-3 p-md-4 d-flex justify-content-between align-items-center"
                    style={{
                      backgroundColor: '#2A2740',
                      border: '1px solid #3A3652',
                    }}
                  >
                    <div>
                      <p className="text-white mb-1">{service.name}</p>
                      <p className="wt-text-muted small mb-0">
                        {service.count ?? 0} services this month
                      </p>
                    </div>
                    <p className="mb-0 text-white">{service.revenue ?? '$0'}</p>
                  </div>
                ))}
                {topServices.length === 0 && (
                  <p className="wt-text-muted small mb-0">No service activity yet.</p>
                )}
              </div>
            </div>

            {/* Recent reviews */}
            <div className="wt-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 text-white mb-0">Recent reviews</h2>
                <Link to="/dashboard" className="btn btn-sm btn-wt-outline">
                  View all
                </Link>
              </div>

              <div className="d-flex flex-column gap-3">
                {recentReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-4 p-3 p-md-4"
                    style={{
                      backgroundColor: '#2A2740',
                      border: '1px solid #3A3652',
                    }}
                  >
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-2">
                      <div>
                        <p className="text-white mb-1">{review.customerName}</p>
                        <p className="wt-text-muted small mb-0">
                          {review.service} • {review.date}
                        </p>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <LuStar
                            key={idx}
                            size={16}
                            style={
                              idx < (review.rating ?? 0)
                                ? { color: '#FF8C42', fill: '#FF8C42' }
                                : { color: '#3A3652' }
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="wt-text-muted small mb-0">{review.reviewText}</p>
                  </div>
                ))}
                {recentReviews.length === 0 && (
                  <p className="wt-text-muted small mb-0">No recent reviews yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="col-12 col-lg-4 d-flex flex-column gap-4">
            <div
              className="wt-card"
              style={{
                borderColor: 'rgba(255,140,66,0.6)',
              }}
            >
              <h3 className="h6 text-white mb-3">Quick actions</h3>
              <div className="d-flex flex-column gap-2">
                <Link
                  to="/manage-shop"
                  className="btn btn-sm btn-wt-outline text-start"
                >
                  Edit shop information
                </Link>
                <Link
                  to="/manage-services"
                  className="btn btn-sm btn-wt-outline text-start"
                >
                  Manage services
                </Link>
                <Link to="/search" className="btn btn-sm btn-wt-outline text-start">
                  Preview how drivers find you
                </Link>
                <button
                  type="button"
                  className="btn btn-sm btn-wt-outline text-start"
                >
                  Respond to recent reviews
                </button>
              </div>
            </div>

            <div
              className="wt-card"
              style={{
                backgroundColor: 'rgba(108,99,255,0.12)',
                borderColor: 'rgba(108,99,255,0.5)',
              }}
            >
              <h3 className="h6 text-white mb-3">Growth tips</h3>
              <ul className="mb-0 small wt-text-muted">
                <li className="mb-1">Respond to reviews to build trust.</li>
                <li className="mb-1">Keep pricing and hours up to date.</li>
                <li className="mb-1">Add photos of your shop and waiting area.</li>
                <li>Highlight specialties like EV, fleet, or performance work.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
