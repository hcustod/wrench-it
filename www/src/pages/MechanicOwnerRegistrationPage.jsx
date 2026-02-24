import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuUser, LuMail, LuLock, LuPhone } from 'react-icons/lu';

export default function MechanicOwnerRegistrationPage() {
  const [role, setRole] = useState('shop-owner');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    certificationNumber: '',
    yearsExperience: '',
    shopName: '',
    businessLicense: '',
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
    setSuccess('Demo only – professional account creation is not wired yet.');
    setError('');
  }

  const isMechanic = role === 'mechanic';

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: '70vh' }}
    >
      <div className="w-100" style={{ maxWidth: '520px' }}>
        <div className="text-center mb-4">
          <h1 className="mb-1">Professional Registration</h1>
          <p className="wt-text-muted mb-0">
            Register as a mechanic or shop owner
          </p>
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

          {/* Role selector */}
          <div
            className="mb-3 rounded-4 p-3"
            style={{ backgroundColor: '#2A2740', border: '2px solid rgba(255,140,66,0.3)' }}
          >
            <div className="text-white small mb-2">I am registering as: *</div>
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label
                  className="d-flex align-items-center gap-2 rounded-4 p-3"
                  style={{
                    backgroundColor: '#242133',
                    border: `2px solid ${!isMechanic ? '#FF8C42' : '#3A3652'}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value="shop-owner"
                    checked={!isMechanic}
                    onChange={() => setRole('shop-owner')}
                    className="form-check-input"
                  />
                  <div>
                    <p className="text-white mb-0">Shop Owner</p>
                    <p className="wt-text-muted mb-0 small">Manage your shop</p>
                  </div>
                </label>
              </div>
              <div className="col-12 col-md-6">
                <label
                  className="d-flex align-items-center gap-2 rounded-4 p-3"
                  style={{
                    backgroundColor: '#242133',
                    border: `2px solid ${isMechanic ? '#FF8C42' : '#3A3652'}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value="mechanic"
                    checked={isMechanic}
                    onChange={() => setRole('mechanic')}
                    className="form-check-input"
                  />
                  <div>
                    <p className="text-white mb-0">Mechanic</p>
                    <p className="wt-text-muted mb-0 small">Verify reviews</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            {/* Common fields */}
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
                  placeholder="Name"
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
                  placeholder="you@shop.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Phone Number *</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuPhone className="wt-text-muted" />
                </span>
                <input
                  type="tel"
                  required
                  className="form-control wt-input border-0"
                  placeholder="(555) 555-1234"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="row g-2">
              <div className="col-12 col-md-6">
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
              <div className="col-12 col-md-6">
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
            </div>

            {/* Conditional fields */}
            {isMechanic ? (
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <label className="form-label text-white small mb-1">
                    Certification Number
                  </label>
                  <input
                    type="text"
                    className="form-control wt-input"
                    placeholder="ASE-123456"
                    value={form.certificationNumber}
                    onChange={(e) => handleChange('certificationNumber', e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label text-white small mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control wt-input"
                    placeholder="5"
                    value={form.yearsExperience}
                    onChange={(e) => handleChange('yearsExperience', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <label className="form-label text-white small mb-1">Shop Name</label>
                  <input
                    type="text"
                    className="form-control wt-input"
                    placeholder="Downtown Auto Care"
                    value={form.shopName}
                    onChange={(e) => handleChange('shopName', e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label text-white small mb-1">
                    Business License Number
                  </label>
                  <input
                    type="text"
                    className="form-control wt-input"
                    placeholder="LIC-000123"
                    value={form.businessLicense}
                    onChange={(e) => handleChange('businessLicense', e.target.value)}
                  />
                </div>
              </div>
            )}

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
                  I confirm that the information provided is accurate and agree to the
                  platform terms for professionals.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-wt-primary w-100"
            >
              Create Professional Account
            </button>
          </form>

          <div className="text-center small mt-3">
            <p className="wt-text-muted mb-1">
              Already have an account?
            </p>
            <Link
              to="/login"
              className="btn btn-sm btn-wt-outline w-100"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

