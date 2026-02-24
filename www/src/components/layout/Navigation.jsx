import { Link, useLocation } from 'react-router-dom';
import { LuWrench, LuUser, LuSearch, LuLogIn } from 'react-icons/lu';

export default function Navigation() {
  const location = useLocation();

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

        <div className="d-flex align-items-center gap-4">
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
            to="/dashboard"
            className={`d-flex align-items-center gap-2 ${
              location.pathname === '/dashboard' ? 'wt-link-nav-active' : 'wt-link-nav'
            }`}
          >
            <LuUser size={16} />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/login"
            className="btn btn-sm btn-wt-primary d-flex align-items-center gap-2"
          >
            <LuLogIn size={16} />
            <span>Login</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

