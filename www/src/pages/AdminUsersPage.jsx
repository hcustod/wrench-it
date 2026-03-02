import { useEffect, useState } from 'react';
import { LuUsers } from 'react-icons/lu';
import { getAdminUsers } from '../api/admin.js';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError('');
      try {
        const data = await getAdminUsers(100);
        if (cancelled) return;
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load users.');
        setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
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
            <LuUsers size={20} />
          </div>
          <h1 className="mb-0">Manage Users</h1>
        </div>
        <p className="wt-text-muted mb-0">Live user directory from the backend.</p>
        {error && (
          <p className="small mt-2 mb-0" style={{ color: '#FF8C42' }}>
            {error}
          </p>
        )}
      </section>

      <section>
        <div className="wt-card">
          {loading ? (
            <p className="wt-text-muted small mb-0">Loading users...</p>
          ) : (
            <div className="table-responsive">
              <table className="w-100">
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#2A2740',
                      borderBottom: '1px solid #3A3652',
                    }}
                  >
                    <th className="py-2 px-2 px-md-3 text-start small text-white">Name</th>
                    <th className="py-2 px-2 px-md-3 text-start small text-white">Email</th>
                    <th className="py-2 px-2 px-md-3 text-start small text-white">Role</th>
                    <th className="py-2 px-2 px-md-3 text-start small text-white">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom:
                          index === users.length - 1 ? 'none' : '1px solid #3A3652',
                      }}
                    >
                      <td className="py-3 px-2 px-md-3 text-white small">{user.name ?? '-'}</td>
                      <td className="py-3 px-2 px-md-3 small wt-text-muted">{user.email ?? '-'}</td>
                      <td className="py-3 px-2 px-md-3 small wt-text-muted">{user.type ?? '-'}</td>
                      <td className="py-3 px-2 px-md-3 small wt-text-muted">{user.joined ?? '-'}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 px-2 px-md-3 small wt-text-muted">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
