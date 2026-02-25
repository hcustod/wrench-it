import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuUser, LuMail, LuLock, LuUserPlus } from 'react-icons/lu';

export default function UserRegistrationPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setSuccess('');
      return;
    }
    setSuccess('Demo only – account creation is not wired yet.');
    setError('');
  }

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: '70vh' }}
    >
      <div className="w-100" style={{ maxWidth: '440px' }}>
        <div className="text-center mb-4">
          <h1 className="mb-1">Create Account</h1>
          <p className="wt-text-muted mb-0">Register as a client</p>
        </div>

        <div className="wt-card">
          {error && (
            <div className="mb-3 small" style={{ color: '#FF8C42' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 small wt-text-muted">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label text-white small mb-1">Full Name *</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuUser className="wt-text-muted" />
                </span>
                <input
                  type="text"
                  required
                  className="form-control wt-input border-0"
                  placeholder="John Smith"
                  value={form.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Email Address *</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuMail className="wt-text-muted" />
                </span>
                <input
                  type="email"
                  required
                  className="form-control wt-input border-0"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Password *</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuLock className="wt-text-muted" />
                </span>
                <input
                  type="password"
                  required
                  className="form-control wt-input border-0"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Confirm Password *</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuLock className="wt-text-muted" />
                </span>
                <input
                  type="password"
                  required
                  className="form-control wt-input border-0"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                />
              </div>
              {error && (
                <div className="small mt-1" style={{ color: '#FF8C42' }}>
                  {error}
                </div>
              )}
            </div>

            <div
              className="rounded-4 p-3 small"
              style={{
                backgroundColor: 'rgba(108,99,255,0.1)',
                border: '1px solid rgba(108,99,255,0.4)',
              }}
            >
              <label className="d-flex align-items-start gap-2">
                <input
                  type="checkbox"
                  required
                  className="form-check-input mt-1"
                />
                <span className="wt-text-muted">
                  I agree to the Terms of Service and Privacy Policy.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-wt-primary d-flex justify-content-center align-items-center gap-2"
            >
              <LuUserPlus size={18} />
              <span>Create Account</span>
            </button>
          </form>

          <div className="d-flex align-items-center gap-2 my-3">
            <div className="flex-grow-1" style={{ height: 1, backgroundColor: '#3A3652' }} />
            <span className="wt-text-muted small">or</span>
            <div className="flex-grow-1" style={{ height: 1, backgroundColor: '#3A3652' }} />
          </div>

          <div className="text-center small">
            <p className="wt-text-muted mb-2">Already have an account?</p>
            <Link
              to="/login"
              className="btn btn-sm btn-wt-outline w-100"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="text-center mt-3 small">
          <Link
            to="/register-pro"
            style={{ color: '#FF8C42', textDecoration: 'none' }}
          >
            Are you a mechanic or shop owner? Register here →
          </Link>
        </div>
      </div>
    </div>
  );
}

