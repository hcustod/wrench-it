import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuStar,
  LuTrendingUp,
  LuMessageSquare,
  LuSettings2,
  LuCornerDownRight,
  LuClipboardList,
  LuTriangleAlert,
} from 'react-icons/lu';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import {
  getMyShopDashboard,
  respondToMyShopReview,
  updateMyShopWorkOrderStatus,
} from '../api/shop.js';
import StatusBadge from '../components/common/StatusBadge.jsx';

const EMPTY_SHOP_PROFILE = {
  name: 'Your Shop',
  rating: 0,
  reviewCount: 0,
  location: 'Unknown location',
  phone: '-',
  approvalStatus: 'PENDING',
  approvalNotes: '',
};

const EMPTY_STATS = {
  averageRating: 0,
  totalReviews: 0,
  profileReviewCount: 0,
  activeServices: 0,
};

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getWorkOrderActions(status) {
  const normalized = typeof status === 'string' ? status.toUpperCase() : '';
  if (normalized === 'REQUESTED') {
    return [
      { label: 'Confirm', status: 'CONFIRMED' },
      { label: 'Decline', status: 'DECLINED' },
    ];
  }
  if (normalized === 'CONFIRMED') {
    return [{ label: 'Start Job', status: 'IN_PROGRESS' }];
  }
  if (normalized === 'IN_PROGRESS') {
    return [{ label: 'Mark Complete', status: 'COMPLETED' }];
  }
  return [];
}

export default function ShopOwnerDashboardPage() {
  const [shopProfile, setShopProfile] = useState(EMPTY_SHOP_PROFILE);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [serviceActivity, setServiceActivity] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [error, setError] = useState('');
  const [respondingReviewId, setRespondingReviewId] = useState('');
  const [updatingWorkOrderId, setUpdatingWorkOrderId] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const data = await getMyShopDashboard();
        if (cancelled) return;

        setShopProfile(data?.shopProfile ?? EMPTY_SHOP_PROFILE);
        setStats(data?.stats ?? EMPTY_STATS);
        setServiceActivity(data?.serviceActivity ?? []);
        setWorkOrders(data?.workOrders ?? []);
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

  async function handleRespondToReview(review) {
    if (!review?.id) return;

    const currentResponse = typeof review.ownerResponse === 'string' ? review.ownerResponse : '';
    const nextResponse = window.prompt(
      'Write your response to this review:',
      currentResponse,
    );
    if (nextResponse == null) return;

    const trimmed = nextResponse.trim();
    if (!trimmed) {
      setError('Response cannot be empty.');
      return;
    }

    setRespondingReviewId(review.id);
    try {
      const updated = await respondToMyShopReview(review.id, { response: trimmed });
      setRecentReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? {
                ...item,
                ownerResponse: updated?.ownerResponse ?? trimmed,
                ownerResponseAt: updated?.ownerResponseAt ?? item.ownerResponseAt,
                ownerResponseBy: updated?.ownerResponseBy ?? item.ownerResponseBy,
              }
            : item,
        ),
      );
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review response.');
    } finally {
      setRespondingReviewId('');
    }
  }

  async function handleUpdateWorkOrder(workOrder, nextStatus) {
    if (!workOrder?.id) return;
    const ownerNotes = nextStatus === 'DECLINED'
      ? window.prompt('Add a short reason for declining this work order:', workOrder.ownerNotes ?? '')
      : workOrder.ownerNotes ?? '';
    if (nextStatus === 'DECLINED' && ownerNotes == null) {
      return;
    }

    setUpdatingWorkOrderId(workOrder.id);
    try {
      const updated = await updateMyShopWorkOrderStatus(workOrder.id, {
        status: nextStatus,
        ownerNotes: ownerNotes ?? '',
      });
      setWorkOrders((current) =>
        current.map((item) => (item.id === workOrder.id ? updated : item)),
      );
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update work order.');
    } finally {
      setUpdatingWorkOrderId('');
    }
  }

  const approvalStatus = shopProfile.approvalStatus ?? 'PENDING';
  const isApproved = approvalStatus === 'APPROVED';

  return (
    <>
      <section className="mb-4">
        <h1 className="mb-1">Shop Dashboard</h1>
        <p className="wt-text-muted mb-0">
          Manage your shop profile, work orders, services, and customer reviews.
        </p>
        {error && (
          <p className="small mt-2 mb-0" style={{ color: 'var(--wt-accent-soft)' }}>
            {error}
          </p>
        )}
      </section>

      {!isApproved && (
        <section className="mb-4">
          <div
            className="wt-card"
            style={{
              borderColor: approvalStatus === 'REJECTED' ? 'var(--wt-danger-border)' : 'var(--wt-accent-border)',
              backgroundColor: approvalStatus === 'REJECTED' ? 'var(--wt-danger-bg)' : 'var(--wt-accent-bg)',
            }}
          >
            <div className="d-flex align-items-start gap-3">
              <LuTriangleAlert
                size={20}
                style={{ color: approvalStatus === 'REJECTED' ? 'var(--wt-danger)' : 'var(--wt-accent-soft)', flexShrink: 0 }}
              />
              <div>
                <div className="text-white mb-1">
                  Shop approval status: {approvalStatus === 'REJECTED' ? 'Rejected' : 'Pending review'}
                </div>
                <div className="wt-text-muted small">
                  Your shop profile is not public until an admin approves it.
                  {shopProfile.approvalNotes ? ` Notes: ${shopProfile.approvalNotes}` : ''}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

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
              helper="Submitted through WrenchIt"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuTrendingUp}
              label="Public Review Count"
              value={Number(stats.profileReviewCount ?? 0).toLocaleString()}
              tone="success"
              helper="Shown on your public profile"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuSettings2}
              label="Active Services"
              value={stats.activeServices ?? 0}
              tone="default"
              helper="Currently listed services"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="row g-4">
          <div className="col-12 col-lg-8 d-flex flex-column gap-4">
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
                    <LuStar size={16} style={{ color: 'var(--wt-warning)', fill: 'var(--wt-warning)' }} />
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
                <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-opacity-25 border-secondary">
                  <span className="wt-text-muted small">Phone</span>
                  <span className="text-white">{shopProfile.phone ?? '-'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-2">
                  <span className="wt-text-muted small">Approval</span>
                  <StatusBadge status={approvalStatus} />
                </div>
              </div>
            </div>

            <div className="wt-card">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
                <div>
                  <h2 className="h5 text-white mb-1">Recent Work Orders</h2>
                  <p className="wt-text-muted small mb-0">
                    Real customer jobs now move through requested, confirmed, in-progress, and completed stages.
                  </p>
                </div>
                <Link to="/manage-services" className="btn btn-wt-outline">
                  Manage services
                </Link>
              </div>

              <div className="d-flex flex-column gap-3">
                {workOrders.map((workOrder) => (
                  <div
                    key={workOrder.id}
                    className="rounded-4 p-3 p-md-4"
                    style={{
                      backgroundColor: 'var(--wt-bg-surface-strong)',
                      border: '1px solid var(--wt-border-strong)',
                    }}
                  >
                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                      <div>
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <p className="text-white mb-0">{workOrder.customerName ?? 'Customer'}</p>
                          <StatusBadge status={workOrder.status} />
                        </div>
                        <p className="wt-text-muted small mb-1">
                          {workOrder.service} • {formatDateTime(workOrder.scheduledFor)}
                        </p>
                        {workOrder.vehicleLabel && (
                          <p className="wt-text-muted small mb-1">
                            Vehicle: {workOrder.vehicleLabel}
                          </p>
                        )}
                        {workOrder.customerNotes && (
                          <p className="wt-text-muted small mb-1">
                            Customer notes: {workOrder.customerNotes}
                          </p>
                        )}
                        {workOrder.ownerNotes && (
                          <p className="wt-text-muted small mb-0">
                            Shop notes: {workOrder.ownerNotes}
                          </p>
                        )}
                      </div>
                      <div className="d-flex flex-column gap-2 align-items-md-end">
                        {getWorkOrderActions(workOrder.status).map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            className={action.status === 'DECLINED' ? 'btn btn-sm btn-wt-outline' : 'btn btn-sm btn-wt-primary'}
                            disabled={updatingWorkOrderId === workOrder.id}
                            onClick={() => {
                              void handleUpdateWorkOrder(workOrder, action.status);
                            }}
                          >
                            {updatingWorkOrderId === workOrder.id ? 'Saving...' : action.label}
                          </button>
                        ))}
                        {getWorkOrderActions(workOrder.status).length === 0 && (
                          <span className="small wt-text-muted">No action required</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {workOrders.length === 0 && (
                  <p className="wt-text-muted small mb-0">No work orders yet.</p>
                )}
              </div>
            </div>

            <div className="wt-card">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
                <div>
                  <h2 className="h5 text-white mb-1">Service Review Activity</h2>
                  <p className="wt-text-muted small mb-0">
                    Counts are based on reviews linked to each service. Base prices reflect your current listings.
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
                {serviceActivity.map((service) => (
                  <div
                    key={service.name}
                    className="rounded-4 p-3 p-md-4 d-flex justify-content-between align-items-center"
                    style={{
                      backgroundColor: 'var(--wt-bg-surface-strong)',
                      border: '1px solid var(--wt-border-strong)',
                    }}
                  >
                    <div>
                      <p className="text-white mb-1">{service.name}</p>
                      <p className="wt-text-muted small mb-0">
                        {service.reviewCount ?? service.count ?? 0} linked review
                        {(service.reviewCount ?? service.count ?? 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="mb-0 text-white">{service.basePrice ?? 'Call'}</p>
                      <p className="wt-text-muted small mb-0">Base price</p>
                    </div>
                  </div>
                ))}
                {serviceActivity.length === 0 && (
                  <p className="wt-text-muted small mb-0">No service-linked review activity yet.</p>
                )}
              </div>
            </div>

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
                      backgroundColor: 'var(--wt-bg-surface-strong)',
                      border: '1px solid var(--wt-border-strong)',
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
                                ? { color: 'var(--wt-warning)', fill: 'var(--wt-warning)' }
                                : { color: 'var(--wt-border-strong)' }
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="wt-text-muted small mb-0">{review.reviewText}</p>
                    {review.ownerResponse && (
                      <div
                        className="rounded-4 p-3 mt-2"
                        style={{
                          backgroundColor: 'var(--wt-accent-bg)',
                          border: '1px solid var(--wt-accent-border)',
                        }}
                      >
                        <p className="text-white small mb-1 d-flex align-items-center gap-2">
                          <LuCornerDownRight size={14} />
                          {review.ownerResponseBy ?? 'Shop Owner'} response
                        </p>
                        <p className="wt-text-muted small mb-0">{review.ownerResponse}</p>
                      </div>
                    )}
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-wt-outline"
                        disabled={respondingReviewId === review.id}
                        onClick={() => {
                          void handleRespondToReview(review);
                        }}
                      >
                        {respondingReviewId === review.id
                          ? 'Saving...'
                          : review.ownerResponse
                            ? 'Edit response'
                            : 'Respond'}
                      </button>
                    </div>
                  </div>
                ))}
                {recentReviews.length === 0 && (
                  <p className="wt-text-muted small mb-0">No recent reviews yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4 d-flex flex-column gap-4">
            <div
              className="wt-card"
              style={{
                borderColor: 'var(--wt-accent-border)',
              }}
            >
              <h3 className="h6 text-white mb-3">Quick actions</h3>
              <div className="d-flex flex-column gap-2">
                <Link to="/manage-shop" className="btn btn-sm btn-wt-outline text-start">
                  Edit shop information
                </Link>
                <Link to="/manage-services" className="btn btn-sm btn-wt-outline text-start">
                  Manage services
                </Link>
                <Link to="/search" className="btn btn-sm btn-wt-outline text-start">
                  Preview how drivers find you
                </Link>
                <button
                  type="button"
                  className="btn btn-sm btn-wt-outline text-start"
                  disabled={recentReviews.length === 0 || Boolean(respondingReviewId)}
                  onClick={() => {
                    const target = recentReviews[0];
                    if (!target) return;
                    void handleRespondToReview(target);
                  }}
                >
                  Respond to recent reviews
                </button>
              </div>
            </div>

            <div
              className="wt-card"
              style={{
                backgroundColor: 'var(--wt-accent-bg)',
                borderColor: 'var(--wt-accent-border)',
              }}
            >
              <h3 className="h6 text-white mb-3 d-flex align-items-center gap-2">
                <LuClipboardList size={16} />
                Growth tips
              </h3>
              <ul className="mb-0 small wt-text-muted">
                <li className="mb-1">Confirm requests quickly so drivers trust your shop.</li>
                <li className="mb-1">Complete work orders promptly to unlock more visit-based reviews.</li>
                <li className="mb-1">Keep pricing and hours up to date.</li>
                <li>Respond to reviews to build trust.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
