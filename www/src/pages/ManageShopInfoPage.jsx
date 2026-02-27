import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuMapPin, LuPhone, LuClock, LuSave } from 'react-icons/lu';
import { getMyShopProfile, updateMyShopProfile } from '../api/shop.js';

const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DEFAULT_HOURS = {
  Monday: { open: '8:00 AM', close: '6:00 PM' },
  Tuesday: { open: '8:00 AM', close: '6:00 PM' },
  Wednesday: { open: '8:00 AM', close: '6:00 PM' },
  Thursday: { open: '8:00 AM', close: '6:00 PM' },
  Friday: { open: '8:00 AM', close: '6:00 PM' },
  Saturday: { open: '9:00 AM', close: '4:00 PM' },
  Sunday: { open: 'Closed', close: '' },
};

const EMPTY_FORM = {
  shopName: '',
  description: '',
  address: '',
  phone: '',
  hours: {},
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

function buildHours(source) {
  const out = {};

  DAY_ORDER.forEach((day) => {
    const sourceWindow = source?.[day] ?? {};
    out[day] = {
      open:
        typeof sourceWindow.open === 'string' && sourceWindow.open.trim()
          ? sourceWindow.open
          : DEFAULT_HOURS[day].open,
      close:
        typeof sourceWindow.close === 'string' ? sourceWindow.close : DEFAULT_HOURS[day].close,
    };
  });

  return out;
}

function normalizeFormFromApi(data) {
  return {
    shopName: data?.shopName ?? '',
    description: data?.description ?? '',
    address: data?.address ?? '',
    phone: data?.phone ?? '',
    hours: buildHours(data?.hours),
  };
}

function cloneHours(hours = {}) {
  const out = {};
  Object.entries(hours).forEach(([day, window]) => {
    out[day] = {
      open: window?.open ?? '',
      close: window?.close ?? '',
    };
  });
  return out;
}

function cloneForm(form) {
  return {
    ...form,
    hours: cloneHours(form.hours),
  };
}

export default function ManageShopInfoPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, hours: buildHours() }));
  const [initialForm, setInitialForm] = useState(() => ({ ...EMPTY_FORM, hours: buildHours() }));
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      try {
        const data = await getMyShopProfile();
        if (cancelled) return;

        const normalized = normalizeFormFromApi(data);
        setForm(cloneForm(normalized));
        setInitialForm(cloneForm(normalized));
        setError('');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load shop profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveMessage('');
    setError('');
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
    setError('');
  }

  function toggleDayClosed(day) {
    const current = form.hours[day];
    const isClosed = current.open === 'Closed';
    setForm((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: isClosed ? { ...DEFAULT_HOURS[day] } : { open: 'Closed', close: '' },
      },
    }));
    setSaveMessage('');
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');
    setError('');

    try {
      const updated = await updateMyShopProfile({
        shopName: form.shopName,
        description: form.description,
        address: form.address,
        phone: form.phone,
        hours: form.hours,
      });

      const normalized = normalizeFormFromApi(updated);
      setForm(cloneForm(normalized));
      setInitialForm(cloneForm(normalized));
      setSaveMessage('Changes saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm(cloneForm(initialForm));
    setSaveMessage('');
    setError('');
  }

  return (
    <>
      <section className="mb-4">
        <h1 className="mb-1">Manage Shop Information</h1>
        <p className="wt-text-muted mb-0">Update your shop&apos;s public profile.</p>
      </section>

      {loading && (
        <p className="small mb-3 wt-text-muted">Loading shop profile...</p>
      )}

      {error && (
        <div
          className="mb-3 small d-flex align-items-center gap-2"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 12,
            backgroundColor: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.5)',
            color: '#f87171',
          }}
        >
          {error}
        </div>
      )}

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
          <button
            type="submit"
            className="btn btn-wt-primary d-inline-flex align-items-center gap-2"
            disabled={saving}
          >
            <LuSave size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="btn btn-wt-outline"
            onClick={handleCancel}
            disabled={saving || loading}
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
