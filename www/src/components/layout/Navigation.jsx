import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LuLogIn, LuLogOut, LuMapPin, LuSearch, LuUser, LuWrench } from 'react-icons/lu';
import { getCurrentUser, logout, routeForRole } from '../../auth/keycloak.js';

function readSearchValue(search, key) {
  const params = new URLSearchParams(search);
  return params.get(key) ?? '';
}

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const [session, setSession] = useState({ loading: true, user: null });
  // Seed the nav search from the current results page so edits feel continuous after navigation.
  const [searchLocation, setSearchLocation] = useState(() => (
    location.pathname === '/search' ? readSearchValue(location.search, 'location') : ''
  ));
  const [searchTerm, setSearchTerm] = useState(() => (
    location.pathname === '/search' ? readSearchValue(location.search, 'service') : ''
  ));

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

  function handleSearch(event) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (searchLocation.trim()) params.set('location', searchLocation.trim());
    if (searchTerm.trim()) params.set('service', searchTerm.trim());

    const query = params.toString();
    navigate(`/search${query ? `?${query}` : ''}`);
  }

  async function handleLogout() {
    await logout();
    setSession({ loading: false, user: null });
    navigate('/', { replace: true });
  }

  const dashboardPath = session.user ? routeForRole(session.user.role) : '/dashboard';
  const isDashboardRoute = location.pathname === '/dashboard'
    || location.pathname === '/mechanic-dashboard'
    || location.pathname === '/shop-dashboard'
    || location.pathname.startsWith('/admin');

  return (
    <nav className={isHome ? 'wt-nav wt-nav-home' : 'wt-nav'}>
      <div className="container py-3">
        <div className="d-flex flex-column gap-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
              <div className="wt-nav-brand-mark">
                <LuWrench size={22} />
              </div>
              <span className="d-block fw-semibold wt-nav-brand-title">WrenchIT</span>
            </Link>

            <div className="d-flex flex-wrap align-items-center gap-3 ms-lg-auto">
              <Link
                to="/compare"
                className={location.pathname === '/compare' ? 'wt-link-nav-active' : 'wt-link-nav'}
              >
                Compare Prices
              </Link>
              <Link
                to={dashboardPath}
                className={isDashboardRoute ? 'wt-link-nav-active' : 'wt-link-nav'}
              >
                <span className="d-inline-flex align-items-center gap-2">
                  <LuUser size={16} />
                  <span>Dashboard</span>
                </span>
              </Link>

              {!session.loading && session.user && (
                <>
                  <span
                    className="wt-text-muted small d-none d-xl-inline"
                    style={{ maxWidth: 180 }}
                    title={session.user.displayName?.trim() || session.user.email || ''}
                  >
                    {session.user.displayName?.trim() || session.user.email}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-wt-outline d-inline-flex align-items-center gap-2"
                    onClick={handleLogout}
                  >
                    <LuLogOut size={16} />
                    <span>Logout</span>
                  </button>
                </>
              )}

              {!session.loading && !session.user && (
                <Link
                  to="/login"
                  className="btn btn-sm btn-wt-primary d-inline-flex align-items-center gap-2"
                >
                  <LuLogIn size={16} />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>

          <form onSubmit={handleSearch} className="wt-nav-search">
            <label className="wt-nav-search-field">
              <LuMapPin size={18} className="wt-text-muted flex-shrink-0" />
              <input
                type="text"
                value={searchLocation}
                onChange={(event) => setSearchLocation(event.target.value)}
                placeholder="City, neighborhood, or postal code"
                aria-label="Search location"
              />
            </label>

            <label className="wt-nav-search-field">
              <LuSearch size={18} className="wt-text-muted flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Service or shop name"
                aria-label="Search service or shop name"
              />
            </label>

            <button type="submit" className="btn btn-wt-primary wt-nav-search-button">
              Search Nearby
            </button>

            <button
              type="button"
              className="btn btn-wt-outline wt-nav-browse-button"
              onClick={() => navigate('/search')}
            >
              Browse Shops
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
