import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuUsers,
  LuStore,
  LuMessageSquare,
  LuTriangleAlert,
  LuShield,
  LuTrendingUp,
} from 'react-icons/lu';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import {
  decidePendingReceipt,
  decideShopApproval,
  getAdminDashboard,
} from '../api/admin.js';

const EMPTY_STATS = {
  totalUsers: 0,
  totalShops: 0,
  totalReviews: 0,
  issues: 0,
  pendingShopApprovals: 0,
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [users, setUsers] = useState([]);
  const [rejectedVerifications, setRejectedVerifications] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
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
        setRejectedVerifications(data?.rejectedVerifications ?? data?.flaggedReviews ?? []);
        setPendingReceipts(data?.pendingReceipts ?? []);
        setPendingShops(data?.pendingShopApprovals ?? data?.pendingShops ?? []);
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

  async function handleUpdateReceiptStatus(id, status) {
    const result = status === 'Approved' ? 'APPROVED' : 'REJECTED';
    try {
      await decidePendingReceipt(id, { result });
      setPendingReceipts((current) =>
        current.map((receipt) =>
          receipt.id === id
            ? {
                ...receipt,
                status,
              }
            : receipt,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save receipt decision.');
    }
  }

  async function handleUpdateShopStatus(id, status) {
    const result = status === 'Approved' ? 'APPROVED' : 'REJECTED';
    const notes = status === 'Rejected'
      ? window.prompt('Optional notes for the shop owner:', '')
      : '';
    if (notes == null) {
      return;
    }

    try {
      await decideShopApproval(id, { result, notes });
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
      setError(err instanceof Error ? err.message : 'Failed to save shop decision.');
    }
  }

  return (
    <>
      <section className="mb-4">
        <div className="d-flex align-items-center gap-3 mb-1">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-4"
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'var(--wt-accent-bg-strong)',
              color: 'var(--wt-accent-soft)',
            }}
          >
            <LuShield size={20} />
          </div>
          <h1 className="mb-0">Admin Dashboard</h1>
        </div>
        <p className="wt-text-muted mb-0">
          Platform overview with separate queues for receipt moderation and shop onboarding approvals.
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
              helper="Approved and pending"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuMessageSquare}
              label="Total reviews"
              value={(stats.totalReviews ?? 0).toLocaleString()}
              tone="success"
              helper="Visit-linked feedback"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatsCard
              icon={LuTriangleAlert}
              label="Issues"
              value={stats.issues ?? 0}
              tone="danger"
              helper="Receipts and shops needing action"
            />
          </div>
        </div>
      </section>

      <section className="mb-4">
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="wt-card h-100 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 text-white mb-0">Recent users</h2>
                <Link to="/admin/users" className="btn btn-sm btn-wt-outline">
                  Manage users
                </Link>
              </div>

              <div className="d-flex flex-column gap-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-4 p-3 p-md-4 d-flex justify-content-between align-items-center"
                    style={{
                      backgroundColor: 'var(--wt-bg-surface-strong)',
                      border: '1px solid var(--wt-border-strong)',
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
                          backgroundColor: 'var(--wt-info-bg)',
                          color: 'var(--wt-info)',
                          borderRadius: 999,
                          border: '1px solid var(--wt-info-border)',
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

          <div className="col-12 col-lg-6">
            <div className="wt-card h-100 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 text-white mb-0">Rejected verification cases</h2>
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'var(--wt-danger-bg)',
                    color: 'var(--wt-danger)',
                    borderRadius: 999,
                    border: '1px solid var(--wt-danger-border)',
                  }}
                >
                  {rejectedVerifications.length} cases
                </span>
              </div>

              <div className="d-flex flex-column gap-3">
                {rejectedVerifications.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-4 p-3 p-md-4"
                    style={{
                      backgroundColor: 'var(--wt-danger-bg)',
                      border: '2px solid var(--wt-danger-border)',
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <p className="text-white mb-1">{review.shopName}</p>
                        <p className="wt-text-muted small mb-0">
                          Submitted by {review.reviewer} • {review.date}
                        </p>
                      </div>
                      <LuTriangleAlert size={18} style={{ color: 'var(--wt-danger)' }} />
                    </div>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                      <p className="text-danger small mb-0">Warning: {review.reason}</p>
                      <Link to={`/admin/review/${review.id}`} className="btn btn-sm btn-wt-outline">
                        Open case
                      </Link>
                    </div>
                  </div>
                ))}
                {rejectedVerifications.length === 0 && (
                  <p className="wt-text-muted small mb-0">No rejected verification cases.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-4">
        <div className="wt-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 text-white mb-0">Pending shop approvals</h2>
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--wt-accent-bg-strong)',
                color: 'var(--wt-accent-soft)',
                borderRadius: 999,
                border: '1px solid var(--wt-accent-border)',
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
                    backgroundColor: 'var(--wt-bg-surface-strong)',
                    borderBottom: '1px solid var(--wt-border-strong)',
                  }}
                >
                  <th className="py-2 px-2 px-md-3 text-start small text-white">Shop</th>
                  <th className="py-2 px-2 px-md-3 text-start small text-white">Owner</th>
                  <th className="py-2 px-2 px-md-3 text-start small text-white">Location</th>
                  <th className="py-2 px-2 px-md-3 text-start small text-white">Status</th>
                  <th className="py-2 px-2 px-md-3 text-end small text-white">Actions</th>
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
                          : '1px solid var(--wt-border-strong)',
                    }}
                  >
                    <td className="py-3 px-2 px-md-3 text-white small">{shop.name}</td>
                    <td className="py-3 px-2 px-md-3 small wt-text-muted">{shop.owner}</td>
                    <td className="py-3 px-2 px-md-3 small wt-text-muted">{shop.location}</td>
                    <td className="py-3 px-2 px-md-3 small wt-text-muted">{shop.status}</td>
                    <td className="py-3 px-2 px-md-3 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-wt-primary"
                          onClick={() => {
                            void handleUpdateShopStatus(shop.id, 'Approved');
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-wt-outline"
                          onClick={() => {
                            void handleUpdateShopStatus(shop.id, 'Rejected');
                          }}
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
                      No shop approvals are waiting.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="wt-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 text-white mb-0">Pending receipt verifications</h2>
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--wt-accent-bg-strong)',
                color: 'var(--wt-accent-soft)',
                borderRadius: 999,
                border: '1px solid var(--wt-accent-border)',
              }}
            >
              {pendingReceipts.length} pending
            </span>
          </div>

          <div className="table-responsive">
            <table className="w-100">
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--wt-bg-surface-strong)',
                    borderBottom: '1px solid var(--wt-border-strong)',
                  }}
                >
                  <th className="py-2 px-2 px-md-3 text-start small text-white">Shop</th>
                  <th className="py-2 px-2 px-md-3 text-start small text-white">Submitted by</th>
                  <th className="py-2 px-2 px-md-3 text-start small text-white">Location</th>
                  <th className="py-2 px-2 px-md-3 text-start small text-white">Status</th>
                  <th className="py-2 px-2 px-md-3 text-end small text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingReceipts.map((receipt, index) => (
                  <tr
                    key={receipt.id}
                    style={{
                      borderBottom:
                        index === pendingReceipts.length - 1
                          ? 'none'
                          : '1px solid var(--wt-border-strong)',
                    }}
                  >
                    <td className="py-3 px-2 px-md-3 text-white small">{receipt.name}</td>
                    <td className="py-3 px-2 px-md-3 small wt-text-muted">{receipt.owner}</td>
                    <td className="py-3 px-2 px-md-3 small wt-text-muted">{receipt.location}</td>
                    <td className="py-3 px-2 px-md-3 small wt-text-muted">{receipt.status}</td>
                    <td className="py-3 px-2 px-md-3 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-wt-primary"
                          onClick={() => {
                            void handleUpdateReceiptStatus(receipt.id, 'Approved');
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-wt-outline"
                          onClick={() => {
                            void handleUpdateReceiptStatus(receipt.id, 'Rejected');
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingReceipts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 px-2 px-md-3 small wt-text-muted">
                      No receipt verifications are waiting.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
              <div className="small wt-text-muted mb-1">Shop onboarding</div>
              <div className="text-white">{stats.pendingShopApprovals ?? 0} pending</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="small wt-text-muted mb-1">Receipt moderation</div>
              <div className="text-white">{pendingReceipts.length} active</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
