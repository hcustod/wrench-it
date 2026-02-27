import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuStar, LuClock, LuCalendar, LuHeart } from 'react-icons/lu';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { listSavedShops } from '../api/saved.js';
import { getMyDashboard } from '../api/user.js';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function UserDashboardPage() {
  const [activeTab, setActiveTab] = useState('reviews');

  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [savedShops, setSavedShops] = useState([]);

  const [dashboardError, setDashboardError] = useState('');
  const [savedError, setSavedError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await getMyDashboard();
        if (cancelled) return;

        const reviewItems = (response?.reviews ?? []).map((item) => ({
          id: item.id,
          storeId: item.storeId,
          shopName: item.shopName,
          service: item.service,
          date: formatDate(item.date),
          status: item.status === 'verified' ? 'verified' : 'pending',
          rating: Number(item.rating ?? 0),
          reviewText: item.reviewText ?? '',
        }));

        const bookingItems = (response?.bookings ?? []).map((item) => ({
          id: item.id,
          storeId: item.storeId,
          shopName: item.shopName,
          service: item.service,
          date: formatDate(item.date),
          time: formatTime(item.time || item.date),
          status: item.status === 'upcoming' ? 'upcoming' : 'completed',
        }));

        setReviews(reviewItems);
        setBookings(bookingItems);
        setDashboardError('');
      } catch (err) {
        if (cancelled) return;
        setReviews([]);
        setBookings([]);
        setDashboardError(
          err instanceof Error ? err.message : 'Failed to load your dashboard data.',
        );
      }
    }

    async function loadSaved() {
      try {
        const response = await listSavedShops();
        if (cancelled) return;
        const items = (response ?? [])
          .filter((item) => item.store)
          .map((item) => {
            const store = item.store;
            return {
              id: store.id,
              name: store.name,
              rating: store.rating ?? 0,
              reviewCount: store.ratingCount ?? 0,
              location:
                store.city && store.state
                  ? `${store.city}, ${store.state}`
                  : store.address,
            };
          });
        setSavedShops(items);
        setSavedError('');
      } catch (err) {
        if (cancelled) return;
        setSavedShops([]);
        setSavedError(
          err instanceof Error ? err.message : 'Failed to load saved shops.',
        );
      }
    }

    loadDashboard();
    loadSaved();

    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status === 'upcoming'),
    [bookings],
  );
  const pastBookings = useMemo(
    () => bookings.filter((b) => b.status === 'completed'),
    [bookings],
  );

  return (
    <>
      {/* Page header */}
      <section className="mb-4">
        <h1 className="mb-1">My Dashboard</h1>
        <p className="wt-text-muted mb-0">
          Manage your reviews, bookings, and saved shops.
        </p>
      </section>

      {/* Tabs card */}
      <section>
        <div className="wt-card p-0">
          <div
            className="d-flex"
            style={{ borderBottom: '1px solid #3A3652' }}
          >
            {[
              { id: 'reviews', label: 'My Reviews' },
              { id: 'bookings', label: 'My Bookings' },
              { id: 'saved', label: 'Saved Shops' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-grow-1 border-0 bg-transparent px-4 px-md-5 py-3"
                  style={{
                    color: isActive ? '#FF8C42' : '#C5C3DA',
                    borderBottom: isActive ? '2px solid #FF8C42' : '2px solid transparent',
                    backgroundColor: isActive ? '#2A2740' : 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 p-md-5">
            {activeTab === 'reviews' && (
              <div className="d-flex flex-column gap-3">
                {dashboardError && (
                  <p className="small" style={{ color: '#FF8C42' }}>
                    {dashboardError}
                  </p>
                )}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-2 gap-2">
                  <h3 className="h5 text-white mb-0">
                    Your Reviews ({reviews.length})
                  </h3>
                  <Link
                    to="/write-review"
                    className="btn btn-wt-primary btn-sm"
                  >
                    Write New Review
                  </Link>
                </div>

                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-4 p-3 p-md-4"
                    style={{
                      backgroundColor: '#2A2740',
                      border: '1px solid #3A3652',
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h4 className="h6 text-white mb-1">{rev.shopName}</h4>
                        <div className="d-flex flex-wrap align-items-center gap-2 small wt-text-muted">
                          <span>{rev.service}</span>
                          <span>•</span>
                          <span>{rev.date}</span>
                        </div>
                      </div>
                      <StatusBadge status={rev.status} />
                    </div>

                    <div className="d-flex align-items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <LuStar
                          key={idx}
                          size={16}
                          style={
                            idx < (rev.rating ?? 0)
                              ? { color: '#FF8C42', fill: '#FF8C42' }
                              : { color: '#3A3652' }
                          }
                        />
                      ))}
                    </div>

                    <p className="wt-text-muted mb-0">{rev.reviewText}</p>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <p className="wt-text-muted small mb-0">
                    You haven&apos;t submitted any reviews yet.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="d-flex flex-column gap-4">
                {dashboardError && (
                  <p className="small" style={{ color: '#FF8C42' }}>
                    {dashboardError}
                  </p>
                )}
                <h3 className="h5 text-white mb-1">Your Bookings</h3>

                {/* Upcoming */}
                <div>
                  <h4 className="h6 text-white mb-3">Upcoming</h4>
                  <div className="d-flex flex-column gap-3">
                    {upcomingBookings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-4 p-3 p-md-4"
                        style={{
                          backgroundColor: '#2A2740',
                          border: '2px solid #FF8C42',
                        }}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
                          <div>
                            <h5 className="h6 text-white mb-1">{b.shopName}</h5>
                            <p className="wt-text-muted mb-2">{b.service}</p>
                            <div className="d-flex flex-wrap align-items-center gap-3 small wt-text-muted">
                              <div className="d-flex align-items-center gap-1">
                                <LuCalendar size={14} />
                                <span>{b.date}</span>
                              </div>
                              <div className="d-flex align-items-center gap-1">
                                <LuClock size={14} />
                                <span>{b.time}</span>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-wt-primary">
                              View Details
                            </button>
                            <button className="btn btn-sm btn-wt-outline">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {upcomingBookings.length === 0 && (
                      <p className="wt-text-muted small mb-0">
                        No upcoming bookings.
                      </p>
                    )}
                  </div>
                </div>

                {/* Past */}
                <div>
                  <h4 className="h6 text-white mb-3">Past Bookings</h4>
                  <div className="d-flex flex-column gap-3">
                    {pastBookings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-4 p-3 p-md-4"
                        style={{
                          backgroundColor: '#2A2740',
                          border: '1px solid #3A3652',
                        }}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
                          <div>
                            <h5 className="h6 text-white mb-1">{b.shopName}</h5>
                            <p className="wt-text-muted mb-2">{b.service}</p>
                            <div className="d-flex flex-wrap align-items-center gap-3 small wt-text-muted">
                              <div className="d-flex align-items-center gap-1">
                                <LuCalendar size={14} />
                                <span>{b.date}</span>
                              </div>
                              <div className="d-flex align-items-center gap-1">
                                <LuClock size={14} />
                                <span>{b.time}</span>
                              </div>
                            </div>
                          </div>
                          <Link
                            to={b.storeId ? `/write-review?storeId=${b.storeId}` : '/write-review'}
                            className="btn btn-sm btn-wt-primary"
                          >
                            Write Review
                          </Link>
                        </div>
                      </div>
                    ))}
                    {pastBookings.length === 0 && (
                      <p className="wt-text-muted small mb-0">
                        No completed bookings yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="d-flex flex-column gap-3">
                <h3 className="h5 text-white mb-1">
                  Saved Shops ({savedShops.length})
                </h3>
                {savedError && (
                  <p className="small" style={{ color: '#FF8C42' }}>
                    {savedError}
                  </p>
                )}
                {savedShops.map((shop) => (
                  <div
                    key={shop.id}
                    className="rounded-4 p-3 p-md-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
                    style={{
                      backgroundColor: '#2A2740',
                      border: '1px solid #3A3652',
                    }}
                  >
                    <div>
                      <h4 className="h6 text-white mb-1">{shop.name}</h4>
                      <div className="d-flex flex-wrap align-items-center gap-3 small wt-text-muted mb-1">
                        <div className="d-flex align-items-center gap-1">
                          <LuStar size={16} style={{ color: '#FF8C42', fill: '#FF8C42' }} />
                          <span className="text-white">
                            {shop.rating.toFixed(1)}
                          </span>
                          <span>
                            ({shop.reviewCount} reviews)
                          </span>
                        </div>
                        <span>{shop.location}</span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Link
                        to={`/shop/${shop.id}`}
                        className="btn btn-sm btn-wt-primary"
                      >
                        View Shop
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-wt-outline d-flex align-items-center justify-content-center"
                      >
                        <LuHeart size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {savedShops.length === 0 && (
                  <p className="wt-text-muted small mb-0">
                    You haven&apos;t saved any shops yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
