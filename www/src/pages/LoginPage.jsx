import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuMail, LuLock, LuLogIn } from 'react-icons/lu';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [message, setMessage] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setMessage(`Demo only – would route to ${role} dashboard here.`);
  }

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: '70vh' }}
    >
      <div className="w-100" style={{ maxWidth: '420px' }}>
        <div className="text-center mb-4">
          <h1 className="mb-1">Welcome Back</h1>
          <p className="wt-text-muted mb-0">Sign in to your account</p>
        </div>

        <div className="wt-card">
          {message && (
            <div className="mb-3 small wt-text-muted">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label text-white small mb-1">Email Address</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuMail className="wt-text-muted" />
                </span>
                <input
                  type="email"
                  required
                  className="form-control wt-input border-0"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuLock className="wt-text-muted" />
                </span>
                <input
                  type="password"
                  required
                  className="form-control wt-input border-0"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Login As</label>
              <select
                className="form-select wt-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="client">Client</option>
                <option value="mechanic">Mechanic</option>
                <option value="shop-owner">Shop Owner</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="d-flex justify-content-between align-items-center small">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="remember"
                />
                <label className="form-check-label wt-text-muted" htmlFor="remember">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="btn btn-link p-0 small"
                style={{ color: '#6C63FF', textDecoration: 'none' }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-wt-primary d-flex justify-content-center align-items-center gap-2"
            >
              <LuLogIn size={18} />
              <span>Login</span>
            </button>
          </form>

          <div className="d-flex align-items-center gap-2 my-3">
            <div className="flex-grow-1" style={{ height: 1, backgroundColor: '#3A3652' }} />
            <span className="wt-text-muted small">or</span>
            <div className="flex-grow-1" style={{ height: 1, backgroundColor: '#3A3652' }} />
          </div>

          <div className="text-center small">
            <p className="wt-text-muted mb-2">Don&apos;t have an account?</p>
            <div className="d-flex gap-2">
              <Link to="/register" className="btn btn-sm btn-wt-outline flex-grow-1">
                Register as Client
              </Link>
              <Link to="/register-pro" className="btn btn-sm btn-wt-primary flex-grow-1">
                Register as Pro
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

