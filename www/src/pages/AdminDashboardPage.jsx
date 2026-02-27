import { useEffect, useState } from 'react';
import {
  LuUsers,
  LuStore,
  LuMessageSquare,
  LuTriangleAlert,
  LuShield,
  LuTrendingUp,
} from 'react-icons/lu';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { decidePendingShop, getAdminDashboard } from '../api/admin.js';

const EMPTY_STATS = {
  totalUsers: 0,
  totalShops: 0,
  totalReviews: 0,
  issues: 0,
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [users, setUsers] = useState([]);
  const [flaggedReviews, setFlaggedReviews] = useState([]);
  const [pendingShops, setPendingShops] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const data = await getAdminDashboard();
        if (cancelled) return;

        setStats(data?.stats ?? EMPTY_STATS);
        setUsers(data?.users ?? []);
        setFlaggedReviews(data?.flaggedReviews ?? []);
        setPendingShops(data?.pendingShops ?? []);
        setError('');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load admin dashboard.');
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpdateShopStatus(id, status) {
    const result = status === 'Approved' ? 'APPROVED' : 'REJECTED';
    try {
      await decidePendingShop(id, { result });
      setPendingShops((current) =>
        current.map((shop) =>
          shop.id === id
            ? {
                ...shop,
                status,
              }
            : shop,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save decision.');
    }
  }

  return (
    <>
      {/* Header */}
      <section className="mb-4">
        <div className="d-flex align-items-center gap-3 mb-1">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-4"
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'rgba(255,140,66,0.18)',
              color: '#FF8C42',
            }}
          >
            <LuShield size={20} />
          </div>
          <h1 className="mb-0">Admin Dashboard</h1>
        </div>
        <p className="wt-text-muted mb-0">
          Platform overview and moderation tools in one place.
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
              icon={LuUsers}
              label="Total users"
              value={(stats.totalUsers ?? 0).toLocaleString()}
              tone="soft"
              helper="From live data"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuStore}
              label="Total shops"
              value={(stats.totalShops ?? 0).toLocaleString()}
              tone="accent"
              helper="From live data"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuMessageSquare}
              label="Total reviews"
              value={(stats.totalReviews ?? 0).toLocaleString()}
              tone="success"
              helper="From live data"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuTriangleAlert}
              label="Issues"
              value={stats.issues ?? 0}
              tone="danger"
              helper="Requires attention"
            />
          </div>
        </div>
      </section>

      {/* Recent users & flagged reviews */}
      <section className="mb-4">
        <div className="row g-4">
          {/* Recent users */}
          <div className="col-12 col-lg-6">
            <div className="wt-card h-100 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 text-white mb-0">Recent users</h2>
                <button
                  type="button"
                  className="btn btn-sm btn-wt-outline"
                >
                  Manage users
                </button>
              </div>

              <div className="d-flex flex-column gap-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-4 p-3 p-md-4 d-flex justify-content-between align-items-center"
                    style={{
                      backgroundColor: '#2A2740',
                      border: '1px solid #3A3652',
                    }}
                  >
                    <div>
                      <p className="text-white mb-1">{user.name}</p>
                      <p className="wt-text-muted small mb-0">{user.email}</p>
                    </div>
                    <div className="text-end">
                      <span
                        className="badge mb-1"
                        style={{
                          backgroundColor: 'rgba(59,130,246,0.18)',
                          color: '#60a5fa',
                          borderRadius: 999,
                          border: '1px solid rgba(59,130,246,0.6)',
                        }}
                      >
                        {user.type}
                      </span>
                      <div className="wt-text-muted small">{user.joined}</div>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="wt-text-muted small mb-0">No recent users.</p>
                )}
              </div>
            </div>
          </div>

          {/* Flagged reviews */}
          <div className="col-12 col-lg-6">
            <div className="wt-card h-100 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 text-white mb-0">Flagged reviews</h2>
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'rgba(248,113,113,0.18)',
                    color: '#f87171',
                    borderRadius: 999,
                    border: '1px solid rgba(248,113,113,0.6)',
                  }}
                >
                  {flaggedReviews.length} active
                </span>
              </div>

              <div className="d-flex flex-column gap-3">
                {flaggedReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-4 p-3 p-md-4"
                    style={{
                      backgroundColor: 'rgba(127,29,29,0.5)',
                      border: '2px solid rgba(248,113,113,0.6)',
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <p className="text-white mb-1">{review.shopName}</p>
                        <p className="wt-text-muted small mb-0">
                          By {review.reviewer} • {review.date}
                        </p>
                      </div>
                      <LuTriangleAlert size={18} style={{ color: '#f87171' }} />
                    </div>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                      <p className="text-danger small mb-0">⚠ {review.reason}</p>
                      <button
                        type="button"
                        className="btn btn-sm btn-wt-outline"
                      >
                        Open review
                      </button>
                    </div>
                  </div>
                ))}
                {flaggedReviews.length === 0 && (
                  <p className="wt-text-muted small mb-0">No flagged reviews.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pending shops table */}
      <section>
        <div className="wt-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 text-white mb-0">Pending shop verifications</h2>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(255,140,66,0.18)',
                color: '#FF8C42',
                borderRadius: 999,
                border: '1px solid rgba(255,140,66,0.6)',
              }}
            >
              {pendingShops.length} pending
            </span>
          </div>

          <div className="table-responsive">
            <table className="w-100">
              <thead>
                <tr
                  style={{
                    backgroundColor: '#2A2740',
                    borderBottom: '1px solid #3A3652',
                  }}
                >
                  <th className="py-2 px-2 px-md-3 text-start small text-white">
                    Shop
                  </th>
                  <th className="py-2 px-2 px-md-3 text-start small text-white">
                    Owner
                  </th>
                  <th className="py-2 px-2 px-md-3 text-start small text-white">
                    Location
                  </th>
                  <th className="py-2 px-2 px-md-3 text-start small text-white">
                    Status
                  </th>
                  <th className="py-2 px-2 px-md-3 text-end small text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingShops.map((shop, index) => (
                  <tr
                    key={shop.id}
                    style={{
                      borderBottom:
                        index === pendingShops.length - 1
                          ? 'none'
                          : '1px solid #3A3652',
                    }}
                  >
                    <td className="py-3 px-2 px-md-3 text-white small">
                      {shop.name}
                    </td>
                    <td className="py-3 px-2 px-md-3 small wt-text-muted">
                      {shop.owner}
                    </td>
                    <td className="py-3 px-2 px-md-3 small wt-text-muted">
                      {shop.location}
                    </td>
                    <td className="py-3 px-2 px-md-3 small">
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            shop.status === 'Approved'
                              ? 'rgba(22,163,74,0.18)'
                              : shop.status === 'Rejected'
                                ? 'rgba(248,113,113,0.18)'
                                : 'rgba(255,140,66,0.18)',
                          color:
                            shop.status === 'Approved'
                              ? '#22c55e'
                              : shop.status === 'Rejected'
                                ? '#f87171'
                                : '#FF8C42',
                          borderRadius: 999,
                          border:
                            shop.status === 'Approved'
                              ? '1px solid rgba(22,163,74,0.6)'
                              : shop.status === 'Rejected'
                                ? '1px solid rgba(248,113,113,0.6)'
                                : '1px solid rgba(255,140,66,0.6)',
                        }}
                      >
                        {shop.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 px-md-3 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-wt-primary"
                          onClick={() =>
                            handleUpdateShopStatus(shop.id, 'Approved')
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-wt-outline"
                          onClick={() =>
                            handleUpdateShopStatus(shop.id, 'Rejected')
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingShops.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 px-2 px-md-3 small wt-text-muted">
                      No pending verifications.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Platform health summary */}
      <section className="mt-4">
        <div className="wt-card">
          <h2 className="h6 text-white mb-3">Platform health</h2>
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="small wt-text-muted mb-1">User growth</div>
              <div className="text-white d-flex align-items-center gap-1">
                <LuTrendingUp size={14} />
                <span>Live metrics</span>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="small wt-text-muted mb-1">Review accuracy</div>
              <div className="text-white">Data-driven</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="small wt-text-muted mb-1">Active mechanics</div>
              <div className="text-white">From validations</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="small wt-text-muted mb-1">Avg response time</div>
              <div className="text-white">Live updates</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
