import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPlus, LuPencil, LuTrash2, LuSave } from 'react-icons/lu';
import {
  createMyShopService,
  deleteMyShopService,
  getMyShopServices,
  updateMyShopService,
} from '../api/shop.js';

const CATEGORIES = [
  'Maintenance',
  'Brakes',
  'Diagnostics',
  'Tires',
  'Electrical',
  'Transmission',
  'Climate Control',
  'Alignment',
  'Engine',
  'Suspension',
  'Other',
];

const inputStyle = {
  backgroundColor: '#2A2740',
  border: '1px solid #3A3652',
  borderRadius: 12,
  color: '#ffffff',
  padding: '0.6rem 1rem',
  width: '100%',
};

const EMPTY_NEW_SERVICE = {
  name: '',
  price: '',
  duration: '',
  category: 'Maintenance',
};

function normalizeService(service) {
  return {
    id: service?.id,
    name: service?.name ?? '',
    price: typeof service?.price === 'number' ? service.price : 0,
    duration: service?.duration ?? '—',
    category: service?.category ?? 'Other',
  };
}

function toUpsertPayload(service) {
  const parsedPrice = Number(service.price);
  return {
    name: service.name.trim(),
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    duration: service.duration === '—' ? '' : service.duration,
    category: service.category,
  };
}

export default function ManageServicesPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newService, setNewService] = useState(EMPTY_NEW_SERVICE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyAdd, setBusyAdd] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState(null);
  const [busyUpdateId, setBusyUpdateId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      setLoading(true);
      try {
        const response = await getMyShopServices();
        if (cancelled) return;
        setServices((response ?? []).map(normalizeService));
        setError('');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load services.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }

    setBusyDeleteId(id);
    setError('');

    try {
      await deleteMyShopService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service.');
    } finally {
      setBusyDeleteId(null);
    }
  }

  async function handleAddService(e) {
    e.preventDefault();

    if (!newService.name.trim()) {
      setError('Service name is required.');
      return;
    }

    setBusyAdd(true);
    setError('');

    try {
      const created = await createMyShopService(toUpsertPayload(newService));
      setServices((prev) => [...prev, normalizeService(created)]);
      setNewService(EMPTY_NEW_SERVICE);
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add service.');
    } finally {
      setBusyAdd(false);
    }
  }

  function handleStartEdit(service) {
    setEditingId(service.id);
    setError('');
  }

  function handleUpdateService(id, field, value) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  async function handleSaveChanges(id) {
    const current = services.find((s) => s.id === id);
    if (!current) return;

    if (!current.name.trim()) {
      setError('Service name is required.');
      return;
    }

    setBusyUpdateId(id);
    setError('');

    try {
      const updated = await updateMyShopService(id, toUpsertPayload(current));
      setServices((prev) =>
        prev.map((s) => (s.id === id ? normalizeService(updated) : s))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service.');
    } finally {
      setBusyUpdateId(null);
    }
  }

  function handleSave() {
    navigate('/shop-dashboard');
  }

  return (
    <>
      <section className="mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h1 className="mb-1">Manage Services &amp; Pricing</h1>
            <p className="wt-text-muted mb-0 small">Update your service offerings and prices.</p>
          </div>
          <button
            type="button"
            className="btn btn-wt-primary d-inline-flex align-items-center gap-2"
            onClick={() => setShowAddModal(true)}
            disabled={loading}
          >
            <LuPlus size={18} />
            Add New Service
          </button>
        </div>
      </section>

      {error && (
        <p className="small mb-3" style={{ color: '#FF8C42' }}>
          {error}
        </p>
      )}

      <div className="wt-card p-0 mb-4 overflow-hidden">
        <div
          className="p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2"
          style={{ backgroundColor: '#2A2740', borderBottom: '1px solid #3A3652' }}
        >
          <div>
            <h2 className="h6 text-white mb-1">Your Services</h2>
            <p className="wt-text-muted small mb-0">
              {loading ? 'Loading...' : `${services.length} active services`}
            </p>
          </div>
        </div>
        <div className="table-responsive">
          <table className="w-100">
            <thead>
              <tr style={{ backgroundColor: '#2A2740', borderBottom: '1px solid #3A3652' }}>
                <th className="px-3 px-md-4 py-3 text-start text-white small">Service Name</th>
                <th className="px-3 px-md-4 py-3 text-start text-white small">Price</th>
                <th className="px-3 px-md-4 py-3 text-start text-white small">Duration</th>
                <th className="px-3 px-md-4 py-3 text-start text-white small">Category</th>
                <th className="px-3 px-md-4 py-3 text-end text-white small">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, idx) => (
                <tr
                  key={service.id}
                  style={{
                    borderBottom: idx < services.length - 1 ? '1px solid #3A3652' : 'none',
                  }}
                >
                  <td className="px-3 px-md-4 py-3">
                    {editingId === service.id ? (
                      <input
                        type="text"
                        className="form-control"
                        value={service.name}
                        onChange={(e) => handleUpdateService(service.id, 'name', e.target.value)}
                        style={{ ...inputStyle, maxWidth: 200 }}
                      />
                    ) : (
                      <span className="text-white">{service.name}</span>
                    )}
                  </td>
                  <td className="px-3 px-md-4 py-3">
                    {editingId === service.id ? (
                      <input
                        type="number"
                        className="form-control"
                        value={service.price}
                        onChange={(e) =>
                          handleUpdateService(service.id, 'price', Number(e.target.value))
                        }
                        style={{ ...inputStyle, maxWidth: 100 }}
                      />
                    ) : (
                      <span className="text-white">${service.price}</span>
                    )}
                  </td>
                  <td className="px-3 px-md-4 py-3">
                    {editingId === service.id ? (
                      <input
                        type="text"
                        className="form-control"
                        value={service.duration}
                        onChange={(e) =>
                          handleUpdateService(service.id, 'duration', e.target.value)
                        }
                        style={{ ...inputStyle, maxWidth: 120 }}
                      />
                    ) : (
                      <span className="wt-text-muted">{service.duration}</span>
                    )}
                  </td>
                  <td className="px-3 px-md-4 py-3">
                    {editingId === service.id ? (
                      <select
                        className="form-select"
                        value={service.category}
                        onChange={(e) =>
                          handleUpdateService(service.id, 'category', e.target.value)
                        }
                        style={{ ...inputStyle, maxWidth: 160 }}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'rgba(255,140,66,0.2)',
                          color: '#FF8C42',
                          borderRadius: 999,
                          border: '1px solid rgba(255,140,66,0.4)',
                        }}
                      >
                        {service.category}
                      </span>
                    )}
                  </td>
                  <td className="px-3 px-md-4 py-3 text-end">
                    <div className="d-flex justify-content-end gap-1">
                      {editingId === service.id ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-wt-primary"
                          onClick={() => handleSaveChanges(service.id)}
                          disabled={busyUpdateId === service.id}
                        >
                          {busyUpdateId === service.id ? 'Saving...' : 'Done'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-wt-outline p-2"
                          onClick={() => handleStartEdit(service)}
                          title="Edit"
                        >
                          <LuPencil size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-wt-outline p-2 text-danger"
                        onClick={() => handleDelete(service.id)}
                        title="Delete"
                        disabled={busyDeleteId === service.id}
                      >
                        <LuTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && services.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 px-md-4 py-3 wt-text-muted small">
                    No services yet. Add your first service.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-wt-primary d-inline-flex align-items-center gap-2"
          onClick={handleSave}
        >
          <LuSave size={18} />
          Back to Dashboard
        </button>
        <button
          type="button"
          className="btn btn-wt-outline"
          onClick={() => navigate('/shop-dashboard')}
        >
          Cancel
        </button>
      </div>

      {/* Add Service Modal */}
      {showAddModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050 }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="wt-card w-100"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="h5 text-white mb-4">Add New Service</h2>
            <form onSubmit={handleAddService} className="d-flex flex-column gap-3">
              <div>
                <label className="form-label text-white small mb-1">Service Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newService.name}
                  onChange={(e) => setNewService((s) => ({ ...s, name: e.target.value }))}
                  required
                  placeholder="e.g., Oil Change"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="form-label text-white small mb-1">Price ($) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={newService.price}
                  onChange={(e) => setNewService((s) => ({ ...s, price: e.target.value }))}
                  required
                  min={0}
                  step={0.01}
                  placeholder="45.00"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="form-label text-white small mb-1">Duration *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newService.duration}
                  onChange={(e) => setNewService((s) => ({ ...s, duration: e.target.value }))}
                  required
                  placeholder="e.g., 30 min, 1 hour"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="form-label text-white small mb-1">Category *</label>
                <select
                  className="form-select"
                  value={newService.category}
                  onChange={(e) => setNewService((s) => ({ ...s, category: e.target.value }))}
                  required
                  style={inputStyle}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="d-flex gap-2 pt-2">
                <button type="submit" className="btn btn-wt-primary flex-grow-1" disabled={busyAdd}>
                  {busyAdd ? 'Adding...' : 'Add Service'}
                </button>
                <button
                  type="button"
                  className="btn btn-wt-outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={busyAdd}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
