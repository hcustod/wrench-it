import { Link } from 'react-router-dom';
import { LuHouse, LuSearch, LuTriangleAlert } from 'react-icons/lu';

export default function NotFoundPage() {
  return (
    <div className="min-vh-75 d-flex align-items-center justify-content-center py-5 px-3">
      <div className="text-center" style={{ maxWidth: 420 }}>
        <div className="mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{
              width: 96,
              height: 96,
              backgroundColor: '#2A2740',
              border: '1px solid #3A3652',
            }}
          >
            <LuTriangleAlert size={48} style={{ color: '#6C63FF' }} />
          </div>
          <h1 className="display-5 text-white mb-1">404</h1>
          <h2 className="h4 text-white mb-2">Page Not Found</h2>
          <p className="wt-text-muted mb-0">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="d-flex flex-column gap-2 mb-4">
          <Link
            to="/"
            className="btn btn-wt-primary d-inline-flex align-items-center justify-content-center gap-2"
          >
            <LuHouse size={20} />
            Go to Homepage
          </Link>
          <Link
            to="/search"
            className="btn btn-wt-outline d-inline-flex align-items-center justify-content-center gap-2"
          >
            <LuSearch size={20} />
            Browse Shops
          </Link>
        </div>

        <div
          className="pt-4 mt-4 border-top"
          style={{ borderColor: '#3A3652' }}
        >
          <p className="wt-text-muted small mb-3">Helpful links</p>
          <div className="d-flex justify-content-center gap-4 flex-wrap">
            <Link to="/search" className="wt-link-nav">
              Find Shops
            </Link>
            <Link to="/compare" className="wt-link-nav">
              Compare Prices
            </Link>
            <Link to="/login" className="wt-link-nav">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
