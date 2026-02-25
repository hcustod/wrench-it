import { Link } from 'react-router-dom';
import { LuWrench } from 'react-icons/lu';

export default function Footer() {
  return (
    <footer className="wt-footer mt-5">
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <LuWrench size={20} style={{ color: '#6C63FF' }} />
              <span className="text-white">WrenchIT</span>
            </div>
            <p className="wt-text-muted small mb-0">
              Find honest, local mechanics you can trust.
            </p>
          </div>

          <div className="col-12 col-md-2">
            <h3 className="h6 text-white mb-3">For Users</h3>
            <ul className="list-unstyled mb-0">
              <li className="mb-2">
                <Link to="/search" className="wt-text-muted text-decoration-none small">
                  Find Shops
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/compare" className="wt-text-muted text-decoration-none small">
                  Compare Prices
                </Link>
              </li>
              <li>
                <Link to="/write-review" className="wt-text-muted text-decoration-none small">
                  Write Review
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-12 col-md-3">
            <h3 className="h6 text-white mb-3">For Professionals</h3>
            <ul className="list-unstyled mb-0">
              <li className="mb-2">
                <Link to="/shop-dashboard" className="wt-text-muted text-decoration-none small">
                  Shop Owner
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/mechanic-dashboard" className="wt-text-muted text-decoration-none small">
                  Mechanic
                </Link>
              </li>
              <li>
                <Link to="/register-pro" className="wt-text-muted text-decoration-none small">
                  Register Shop
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-12 col-md-3">
            <h3 className="h6 text-white mb-3">Account</h3>
            <ul className="list-unstyled mb-0">
              <li className="mb-2">
                <Link to="/login" className="wt-text-muted text-decoration-none small">
                  Login
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/register" className="wt-text-muted text-decoration-none small">
                  Register
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="wt-text-muted text-decoration-none small">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-4 pt-4 text-center wt-text-muted small"
          style={{ borderTop: '1px solid #3A3652' }}
        >
          © {new Date().getFullYear()} WrenchIT. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

