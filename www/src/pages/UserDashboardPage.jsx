import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuStar, LuClock, LuCalendar, LuHeart, LuWrench } from 'react-icons/lu';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { listSavedShops, unsaveShop } from '../api/saved.js';
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

function isClosedStatus(status) {
  const normalized = typeof status === 'string' ? status.toUpperCase() : '';
  return normalized === 'COMPLETED' || normalized === 'DECLINED' || normalized === 'CANCELED';
}

export default function UserDashboardPage() {
  const [activeTab, setActiveTab] = useState('workOrders');

  const [workOrders, setWorkOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [receiptSubmissions, setReceiptSubmissions] = useState([]);
  const [savedShops, setSavedShops] = useState([]);
  const [removingSavedId, setRemovingSavedId] = useState(null);

  const [dashboardError, setDashboardError] = useState('');
  const [savedError, setSavedError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await getMyDashboard();
        if (cancelled) return;

        const workOrderItems = (response?.workOrders ?? response?.bookings ?? []).map((item) => ({
          id: item.id,
          storeId: item.storeId,
          shopName: item.shopName,
          service: item.service,
          date: formatDate(item.scheduledFor || item.date),
          time: formatTime(item.scheduledFor || item.time || item.date),
          status: item.status ?? 'REQUESTED',
          vehicleLabel: item.vehicleLabel ?? '',
          customerNotes: item.customerNotes ?? '',
          ownerNotes: item.ownerNotes ?? '',
          canReview: Boolean(item.canReview),
        }));

        // Normalize the dashboard payload once here so the tab views can stay presentation-only.
        const reviewItems = (response?.reviews ?? []).map((item) => ({
          id: item.id,
          storeId: item.storeId,
          workOrderId: item.workOrderId,
          shopName: item.shopName,
          service: item.service,
          date: formatDate(item.date),
          status: item.status ?? 'published',
          rating: Number(item.rating ?? 0),
          reviewText: item.reviewText ?? '',
        }));

        const submissionItems = (response?.receiptSubmissions ?? []).map((item) => ({
          id: item.id,
          storeId: item.storeId,
          shopName: item.shopName,
          service: item.service,
          date: formatDate(item.date),
          time: formatTime(item.time || item.date),
          status: item.status ?? 'pending',
        }));

        setWorkOrders(workOrderItems);
        setReviews(reviewItems);
        setReceiptSubmissions(submissionItems);
        setDashboardError('');
      } catch (err) {
        if (cancelled) return;
        setWorkOrders([]);
        setReviews([]);
        setReceiptSubmissions([]);
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

  const activeWorkOrders = useMemo(
    () => workOrders.filter((item) => !isClosedStatus(item.status)),
    [workOrders],
  );
  const closedWorkOrders = useMemo(
    // Keep completed/declined jobs separate so the active list stays useful at a glance.
    () => workOrders.filter((item) => isClosedStatus(item.status)),
    [workOrders],
  );
  const pendingReceiptSubmissions = useMemo(
    () => receiptSubmissions.filter((item) => item.status === 'pending'),
    [receiptSubmissions],
  );
  const reviewedReceiptSubmissions = useMemo(
    () => receiptSubmissions.filter((item) => item.status !== 'pending'),
    [receiptSubmissions],
  );

  async function handleUnsave(storeId) {
    setRemovingSavedId(storeId);
    setSavedError('');
    try {
      await unsaveShop(storeId);
      setSavedShops((prev) => prev.filter((shop) => shop.id !== storeId));
    } catch (err) {
      setSavedError(err instanceof Error ? err.message : 'Failed to remove saved shop.');
    } finally {
      setRemovingSavedId(null);
    }
  }

  return (
    <>
      <section className="mb-4">
        <h1 className="mb-1">My Dashboard</h1>
        <p className="wt-text-muted mb-0">
          Track work orders, visit-based reviews, receipt submissions, and saved shops.
        </p>
      </section>

      <section>
        <div className="wt-card p-0">
          <div
            className="d-flex flex-wrap"
            style={{ borderBottom: '1px solid #3A3652' }}
          >
            {[
              { id: 'workOrders', label: 'Work Orders' },
              { id: 'reviews', label: 'My Reviews' },
              { id: 'receipts', label: 'Receipt Submissions' },
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
            {activeTab === 'workOrders' && (
              <div className="d-flex flex-column gap-4">
                {dashboardError && (
                  <p className="small" style={{ color: '#FF8C42' }}>
                    {dashboardError}
                  </p>
                )}

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                  <div>
                    <h3 className="h5 text-white mb-1">Your Work Orders</h3>
                    <p className="wt-text-muted small mb-0">
                      These move from requested to completed, then unlock review submission.
                    </p>
                  </div>
                  <Link to="/search" className="btn btn-sm btn-wt-primary">
                    Find a Shop
                  </Link>
                </div>

                <div>
                  <h4 className="h6 text-white mb-3">Active Requests</h4>
                  <div className="d-flex flex-column gap-3">
                    {activeWorkOrders.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-4 p-3 p-md-4"
                        style={{
                          backgroundColor: '#2A2740',
                          border: '1px solid #3A3652',
                        }}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
                          <div>
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                              <h5 className="h6 text-white mb-0">{item.shopName}</h5>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="wt-text-muted mb-2">{item.service}</p>
                            <div className="d-flex flex-wrap align-items-center gap-3 small wt-text-muted">
                              <div className="d-flex align-items-center gap-1">
                                <LuCalendar size={14} />
                                <span>{item.date}</span>
                              </div>
                              <div className="d-flex align-items-center gap-1">
                                <LuClock size={14} />
                                <span>{item.time}</span>
                              </div>
                              {item.vehicleLabel && (
                                <div className="d-flex align-items-center gap-1">
                                  <LuWrench size={14} />
                                  <span>{item.vehicleLabel}</span>
                                </div>
                              )}
                            </div>
                            {item.customerNotes && (
                              <p className="wt-text-muted small mb-0 mt-2">
                                Your notes: {item.customerNotes}
                              </p>
                            )}
                            {item.ownerNotes && (
                              <p className="wt-text-muted small mb-0 mt-2">
                                Shop notes: {item.ownerNotes}
                              </p>
                            )}
                          </div>
                          <Link
                            to={`/shop/${item.storeId}`}
                            className="btn btn-sm btn-wt-outline"
                          >
                            Open Shop
                          </Link>
                        </div>
                      </div>
                    ))}
                    {activeWorkOrders.length === 0 && (
                      <p className="wt-text-muted small mb-0">
                        No active work orders yet.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="h6 text-white mb-3">Closed Work Orders</h4>
                  <div className="d-flex flex-column gap-3">
                    {closedWorkOrders.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-4 p-3 p-md-4"
                        style={{
                          backgroundColor: '#2A2740',
                          border: '1px solid #3A3652',
                        }}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
                          <div>
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                              <h5 className="h6 text-white mb-0">{item.shopName}</h5>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="wt-text-muted mb-2">{item.service}</p>
                            <div className="d-flex flex-wrap align-items-center gap-3 small wt-text-muted">
                              <div className="d-flex align-items-center gap-1">
                                <LuCalendar size={14} />
                                <span>{item.date}</span>
                              </div>
                              <div className="d-flex align-items-center gap-1">
                                <LuClock size={14} />
                                <span>{item.time}</span>
                              </div>
                            </div>
                            {item.ownerNotes && (
                              <p className="wt-text-muted small mb-0 mt-2">
                                Shop notes: {item.ownerNotes}
                              </p>
                            )}
                          </div>
                          <div className="d-flex flex-column gap-2">
                            <Link
                              to={`/shop/${item.storeId}`}
                              className="btn btn-sm btn-wt-outline"
                            >
                              Open Shop
                            </Link>
                            {item.canReview && (
                              <Link
                                to={`/write-review?storeId=${item.storeId}&workOrderId=${item.id}`}
                                className="btn btn-sm btn-wt-primary"
                              >
                                Write Review
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {closedWorkOrders.length === 0 && (
                      <p className="wt-text-muted small mb-0">
                        No completed or closed work orders yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                  <Link to="/write-review" className="btn btn-wt-primary btn-sm">
                    Review Completed Visit
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
                    You haven&apos;t submitted any visit-based reviews yet.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'receipts' && (
              <div className="d-flex flex-column gap-4">
                {dashboardError && (
                  <p className="small" style={{ color: '#FF8C42' }}>
                    {dashboardError}
                  </p>
                )}
                <h3 className="h5 text-white mb-1">Your Receipt Submissions</h3>

                <div>
                  <h4 className="h6 text-white mb-3">Awaiting Review</h4>
                  <div className="d-flex flex-column gap-3">
                    {pendingReceiptSubmissions.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-4 p-3 p-md-4"
                        style={{
                          backgroundColor: '#2A2740',
                          border: '2px solid #FF8C42',
                        }}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
                          <div>
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                              <h5 className="h6 text-white mb-0">{item.shopName}</h5>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="wt-text-muted mb-2">{item.service}</p>
                            <div className="d-flex flex-wrap align-items-center gap-3 small wt-text-muted">
                              <div className="d-flex align-items-center gap-1">
                                <LuCalendar size={14} />
                                <span>{item.date}</span>
                              </div>
                              <div className="d-flex align-items-center gap-1">
                                <LuClock size={14} />
                                <span>{item.time}</span>
                              </div>
                            </div>
                            <p className="wt-text-muted small mb-0 mt-2">
                              Your receipt has been submitted and is waiting for review.
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pendingReceiptSubmissions.length === 0 && (
                      <p className="wt-text-muted small mb-0">
                        No receipts are waiting for review.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="h6 text-white mb-3">Reviewed</h4>
                  <div className="d-flex flex-column gap-3">
                    {reviewedReceiptSubmissions.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-4 p-3 p-md-4"
                        style={{
                          backgroundColor: '#2A2740',
                          border: '1px solid #3A3652',
                        }}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
                          <div>
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                              <h5 className="h6 text-white mb-0">{item.shopName}</h5>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="wt-text-muted mb-2">{item.service}</p>
                            <div className="d-flex flex-wrap align-items-center gap-3 small wt-text-muted">
                              <div className="d-flex align-items-center gap-1">
                                <LuCalendar size={14} />
                                <span>{item.date}</span>
                              </div>
                              <div className="d-flex align-items-center gap-1">
                                <LuClock size={14} />
                                <span>{item.time}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {reviewedReceiptSubmissions.length === 0 && (
                      <p className="wt-text-muted small mb-0">
                        No reviewed receipts yet.
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
                      <Link to={`/shop/${shop.id}`} className="btn btn-sm btn-wt-primary">
                        View Shop
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-wt-outline d-flex align-items-center justify-content-center"
                        onClick={() => handleUnsave(shop.id)}
                        disabled={removingSavedId === shop.id}
                        title="Remove saved shop"
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
