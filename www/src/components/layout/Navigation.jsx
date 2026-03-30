import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LuWrench, LuUser, LuSearch, LuLogIn, LuLogOut } from 'react-icons/lu';
import { getCurrentUser, logout, routeForRole } from '../../auth/keycloak.js';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState({ loading: true, user: null });

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        setSession({ loading: false, user: user ?? null });
      })
      .catch(() => {
        if (!active) return;
        setSession({ loading: false, user: null });
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    setSession({ loading: false, user: null });
    navigate('/', { replace: true });
  }

  const dashboardPath = session.user
    ? routeForRole(session.user.role)
    : '/dashboard';

  return (
    <nav className="wt-nav">
      <div
        className="container d-flex justify-content-between align-items-center"
        style={{ height: '4rem' }}
      >
        <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
          <LuWrench size={24} style={{ color: '#6C63FF' }} />
          <span className="fw-semibold text-white">WrenchIT</span>
        </Link>

        <div className="d-flex align-items-center gap-3 gap-md-4 flex-wrap justify-content-end">
          <Link
            to="/search"
            className={`d-flex align-items-center gap-2 ${
              location.pathname === '/search' ? 'wt-link-nav-active' : 'wt-link-nav'
            }`}
          >
            <LuSearch size={16} />
            <span>Search</span>
          </Link>

          <Link
            to={dashboardPath}
            className={`d-flex align-items-center gap-2 ${
              location.pathname === '/dashboard' ||
              location.pathname === '/mechanic-dashboard' ||
              location.pathname === '/shop-dashboard' ||
              location.pathname === '/admin'
                ? 'wt-link-nav-active'
                : 'wt-link-nav'
            }`}
          >
            <LuUser size={16} />
            <span>Dashboard</span>
          </Link>

          {session.loading && (
            <span className="wt-text-muted small" aria-hidden>
              …
            </span>
          )}

          {!session.loading && session.user && (
            <>
              <span
                className="wt-text-muted small text-truncate d-none d-md-inline"
                style={{ maxWidth: 140 }}
                title={session.user.email ?? ''}
              >
                {session.user.displayName?.trim() || session.user.email}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-wt-outline d-flex align-items-center gap-2"
                onClick={handleLogout}
              >
                <LuLogOut size={16} />
                <span className="d-none d-sm-inline">Log out</span>
              </button>
            </>
          )}

          {!session.loading && !session.user && (
            <Link
              to="/login"
              className="btn btn-sm btn-wt-primary d-flex align-items-center gap-2"
            >
              <LuLogIn size={16} />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
