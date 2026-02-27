import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuMail, LuLock, LuLogIn } from 'react-icons/lu';
import { beginLogin } from '../auth/keycloak.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const result = await beginLogin({ email, password });
      navigate(result.returnTo ?? '/dashboard', { replace: true });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
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

          <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
            <div>
              <label className="form-label text-white small mb-1">Email Address</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuMail className="wt-text-muted" />
                </span>
                <input
                  type="email"
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
                  className="form-control wt-input border-0"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
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
              disabled={loading}
              className="btn btn-wt-primary d-flex justify-content-center align-items-center gap-2"
            >
              <LuLogIn size={18} />
              <span>{loading ? 'Signing in...' : 'Login'}</span>
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
