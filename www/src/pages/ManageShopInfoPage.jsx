import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuMapPin, LuPhone, LuClock, LuSave } from 'react-icons/lu';

const INITIAL_HOURS = {
  Monday: { open: '8:00 AM', close: '6:00 PM' },
  Tuesday: { open: '8:00 AM', close: '6:00 PM' },
  Wednesday: { open: '8:00 AM', close: '6:00 PM' },
  Thursday: { open: '8:00 AM', close: '6:00 PM' },
  Friday: { open: '8:00 AM', close: '6:00 PM' },
  Saturday: { open: '9:00 AM', close: '4:00 PM' },
  Sunday: { open: 'Closed', close: '' },
};

const INITIAL_FORM = {
  shopName: 'Premium Auto Care',
  description:
    'Family-owned shop with over 20 years of experience. Specializing in European and domestic vehicles.',
  address: '123 Main St, Los Angeles, CA 90012',
  phone: '(323) 555-0123',
  hours: { ...INITIAL_HOURS },
};

const inputStyle = {
  backgroundColor: '#2A2740',
  border: '1px solid #3A3652',
  borderRadius: 12,
  color: '#ffffff',
  padding: '0.6rem 1rem',
  width: '100%',
};
const focusBorder = { outline: 'none', borderColor: '#FF8C42' };

export default function ManageShopInfoPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, hours: { ...INITIAL_HOURS } }));
  const [saveMessage, setSaveMessage] = useState('');

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveMessage('');
  }

  function handleHoursChange(day, field, value) {
    setForm((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: { ...prev.hours[day], [field]: value },
      },
    }));
    setSaveMessage('');
  }

  function toggleDayClosed(day) {
    const current = form.hours[day];
    const isClosed = current.open === 'Closed';
    setForm((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: isClosed ? { open: '9:00 AM', close: '5:00 PM' } : { open: 'Closed', close: '' },
      },
    }));
    setSaveMessage('');
  }

  function handleSave(e) {
    e.preventDefault();
    setSaveMessage('Saved (mock).');
  }

  function handleCancel() {
    setForm({
      ...INITIAL_FORM,
      hours: { ...INITIAL_HOURS },
    });
    setSaveMessage('');
  }

  return (
    <>
      <section className="mb-4">
        <h1 className="mb-1">Manage Shop Information</h1>
        <p className="wt-text-muted mb-0">Update your shop&apos;s public profile.</p>
      </section>

      {saveMessage && (
        <div
          className="mb-3 small d-flex align-items-center gap-2"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 12,
            backgroundColor: 'rgba(22,163,74,0.15)',
            border: '1px solid rgba(22,163,74,0.5)',
            color: '#22c55e',
          }}
        >
          {saveMessage}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Basic info */}
        <div className="wt-card mb-4">
          <h2 className="h5 text-white mb-4">Basic Information</h2>
          <div className="d-flex flex-column gap-4">
            <div>
              <label className="form-label text-white small mb-2">Shop Name *</label>
              <input
                type="text"
                className="form-control wt-input"
                value={form.shopName}
                onChange={(e) => handleChange('shopName', e.target.value)}
                required
                style={{ ...inputStyle }}
                onFocus={(e) => Object.assign(e.target.style, focusBorder)}
                onBlur={(e) => (e.target.style.borderColor = '#3A3652')}
              />
            </div>
            <div>
              <label className="form-label text-white small mb-2">Address *</label>
              <div className="d-flex align-items-start gap-2">
                <LuMapPin size={20} className="wt-text-muted mt-2 flex-shrink-0" />
                <div className="flex-grow-1">
                  <input
                    type="text"
                    className="form-control wt-input"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    required
                    style={{ ...inputStyle }}
                    onFocus={(e) => Object.assign(e.target.style, focusBorder)}
                    onBlur={(e) => (e.target.style.borderColor = '#3A3652')}
                  />
                  <div
                    className="mt-3 rounded-4 d-flex align-items-center justify-content-center wt-text-muted"
                    style={{
                      backgroundColor: '#2A2740',
                      border: '1px solid #3A3652',
                      height: 180,
                    }}
                  >
                    <div className="text-center">
                      <LuMapPin size={40} style={{ color: '#6C63FF' }} className="mb-2" />
                      <p className="small mb-0">Interactive map preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="form-label text-white small mb-2">Phone Number *</label>
              <div className="d-flex align-items-center gap-2">
                <LuPhone size={20} className="wt-text-muted flex-shrink-0" />
                <input
                  type="tel"
                  className="form-control wt-input"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                  style={{ ...inputStyle }}
                  onFocus={(e) => Object.assign(e.target.style, focusBorder)}
                  onBlur={(e) => (e.target.style.borderColor = '#3A3652')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operating hours */}
        <div className="wt-card mb-4">
          <div className="d-flex align-items-center gap-2 mb-4">
            <LuClock size={20} style={{ color: '#FF8C42' }} />
            <h2 className="h5 text-white mb-0">Operating Hours</h2>
          </div>
          <div className="d-flex flex-column gap-3">
            {Object.entries(form.hours).map(([day, times]) => (
              <div key={day} className="d-flex flex-wrap align-items-center gap-3">
                <div style={{ minWidth: 100 }}>
                  <span className="text-white">{day}</span>
                </div>
                {times.open === 'Closed' ? (
                  <div className="flex-grow-1">
                    <span className="wt-text-muted">Closed</span>
                  </div>
                ) : (
                  <div className="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
                    <input
                      type="text"
                      className="form-control"
                      value={times.open}
                      onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                      placeholder="9:00 AM"
                      style={{ ...inputStyle, maxWidth: 120 }}
                      onFocus={(e) => Object.assign(e.target.style, focusBorder)}
                      onBlur={(e) => (e.target.style.borderColor = '#3A3652')}
                    />
                    <span className="wt-text-muted">to</span>
                    <input
                      type="text"
                      className="form-control"
                      value={times.close}
                      onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                      placeholder="5:00 PM"
                      style={{ ...inputStyle, maxWidth: 120 }}
                      onFocus={(e) => Object.assign(e.target.style, focusBorder)}
                      onBlur={(e) => (e.target.style.borderColor = '#3A3652')}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-wt-outline"
                  onClick={() => toggleDayClosed(day)}
                >
                  {times.open === 'Closed' ? 'Open' : 'Closed'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="wt-card mb-4">
          <h2 className="h5 text-white mb-4">Shop Description</h2>
          <textarea
            rows={6}
            className="form-control"
            placeholder="Tell customers about your shop, specialties, and what makes you unique..."
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            style={{
              ...inputStyle,
              resize: 'none',
            }}
            onFocus={(e) => Object.assign(e.target.style, focusBorder)}
            onBlur={(e) => (e.target.style.borderColor = '#3A3652')}
          />
        </div>

        {/* Actions */}
        <div className="d-flex flex-wrap gap-3">
          <button type="submit" className="btn btn-wt-primary d-inline-flex align-items-center gap-2">
            <LuSave size={18} />
            Save Changes
          </button>
          <button
            type="button"
            className="btn btn-wt-outline"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-wt-outline"
            onClick={() => navigate('/shop-dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </form>
    </>
  );
}
