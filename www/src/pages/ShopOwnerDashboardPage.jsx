import { Link } from 'react-router-dom';
import {
  LuStar,
  LuTrendingUp,
  LuMessageSquare,
  LuSettings2,
  LuDollarSign,
} from 'react-icons/lu';
import { mockRecentReviews } from '../data/mockData.js';
import StatsCard from '../components/dashboard/StatsCard.jsx';

function getRecentReviews() {
  return mockRecentReviews;
}

function getShopStats(recentReviews, topServices) {
  const totalReviews = 247;
  const averageRating = 4.8;
  const monthlyViews = 1234;
  const activeServices = topServices.length;

  return {
    totalReviews,
    averageRating,
    monthlyViews,
    activeServices,
  };
}

export default function ShopOwnerDashboardPage() {
  const shopProfile = {
    name: 'Premium Auto Care',
    rating: 4.8,
    reviewCount: 247,
    location: 'Downtown, Los Angeles',
    phone: '(323) 555-0123',
  };

  const topServices = [
    { name: 'Oil Change', count: 89, revenue: '$4,005' },
    { name: 'Brake Repair', count: 45, revenue: '$12,600' },
    { name: 'Engine Diagnostics', count: 34, revenue: '$3,230' },
    { name: 'Tire Service', count: 28, revenue: '$2,240' },
  ];

  const recentReviews = getRecentReviews();
  const stats = getShopStats(recentReviews, topServices);

  return (
    <>
      {/* Header */}
      <section className="mb-4">
        <h1 className="mb-1">Shop Dashboard</h1>
        <p className="wt-text-muted mb-0">
          Manage your shop profile, services, and customer reviews.
        </p>
      </section>

      {/* Stats grid */}
      <section className="mb-4">
        <div className="row g-3 g-md-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuStar}
              label="Average Rating"
              value={`${stats.averageRating.toFixed(1)} / 5.0`}
              tone="accent"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuMessageSquare}
              label="Total Reviews"
              value={stats.totalReviews}
              tone="soft"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuTrendingUp}
              label="Monthly Views"
              value={stats.monthlyViews.toLocaleString()}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuDollarSign}
              label="Active Services"
              value={stats.activeServices}
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
                  <span className="text-white">{shopProfile.name}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-opacity-25 border-secondary">
                  <span className="wt-text-muted small">Rating</span>
                  <div className="d-flex align-items-center gap-2">
                    <LuStar size={16} style={{ color: '#FF8C42', fill: '#FF8C42' }} />
                    <span className="text-white">{shopProfile.rating.toFixed(1)}</span>
                    <span className="wt-text-muted small">
                      ({shopProfile.reviewCount} reviews)
                    </span>
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-opacity-25 border-secondary">
                  <span className="wt-text-muted small">Location</span>
                  <span className="text-white">{shopProfile.location}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-2">
                  <span className="wt-text-muted small">Phone</span>
                  <span className="text-white">{shopProfile.phone}</span>
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
                        {service.count} services this month
                      </p>
                    </div>
                    <p className="mb-0 text-white">{service.revenue}</p>
                  </div>
                ))}
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

