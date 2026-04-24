import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createWorkOrder } from '../api/workOrders.js';
import { getStore, listStoreServices } from '../api/stores.js';

function toIsoFromLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // Send a full ISO timestamp so the backend can store one consistent format.
  return date.toISOString();
}

export default function RequestWorkOrderPage() {
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || '';

  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState('');

  const [serviceId, setServiceId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdWorkOrder, setCreatedWorkOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      if (!storeId) {
        setShop(null);
        setServices([]);
        setContextError('Select a shop before requesting work.');
        return;
      }

      setLoadingContext(true);
      setContextError('');
      try {
        const [storeRes, servicesRes] = await Promise.all([
          getStore(storeId),
          listStoreServices(storeId),
        ]);
        if (cancelled) return;
        setShop(storeRes);
        setServices(servicesRes ?? []);
      } catch (err) {
        if (cancelled) return;
        setShop(null);
        setServices([]);
        setContextError(
          err instanceof Error ? err.message : 'Failed to load shop details.',
        );
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    }

    loadContext();

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!storeId || !serviceId) {
      setError('Select a shop service before submitting.');
      return;
    }
    if (!scheduledFor) {
      setError('Choose a requested appointment time.');
      return;
    }

    const scheduledForIso = toIsoFromLocal(scheduledFor);
    if (!scheduledForIso) {
      setError('Enter a valid appointment time.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createWorkOrder({
        storeId,
        serviceId,
        scheduledFor: scheduledForIso,
        vehicleYear: vehicleYear ? Number(vehicleYear) : null,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        customerNotes: customerNotes.trim(),
      });
      setCreatedWorkOrder(created ?? null);
      setSuccess('Work order request submitted to the shop.');
      // Leave the selected shop/service in place so the user still has context after submit.
      setCustomerNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="mb-4">
        <h1 className="mb-1">Request Work Order</h1>
        <p className="wt-text-muted mb-0">
          Send a structured service request to the shop so they can confirm and complete the job.
        </p>
      </section>

      <section>
        <div className="wt-card" style={{ maxWidth: '760px', margin: '0 auto' }}>
          {loadingContext && (
            <div className="small mb-3 wt-text-muted">Loading shop and service data...</div>
          )}
          {contextError && (
            <div className="small mb-3" style={{ color: '#FF8C42' }}>
              {contextError}
            </div>
          )}
          {error && (
            <div className="small mb-3" style={{ color: '#FF8C42' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="small mb-3 wt-text-muted">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label text-white small mb-1">Shop</label>
              <input
                type="text"
                className="form-control wt-input"
                value={shop?.name ?? 'Select a shop from the public profile'}
                readOnly
              />
            </div>

            <div>
              <label className="form-label text-white small mb-1">Requested Service *</label>
              <select
                className="form-select wt-input"
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                disabled={!storeId || loadingContext}
              >
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Requested Time *</label>
              <input
                type="datetime-local"
                className="form-control wt-input"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
              />
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label text-white small mb-1">Vehicle Year</label>
                <input
                  type="number"
                  className="form-control wt-input"
                  placeholder="2018"
                  value={vehicleYear}
                  onChange={(event) => setVehicleYear(event.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label text-white small mb-1">Vehicle Make</label>
                <input
                  type="text"
                  className="form-control wt-input"
                  placeholder="Toyota"
                  value={vehicleMake}
                  onChange={(event) => setVehicleMake(event.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label text-white small mb-1">Vehicle Model</label>
                <input
                  type="text"
                  className="form-control wt-input"
                  placeholder="Corolla"
                  value={vehicleModel}
                  onChange={(event) => setVehicleModel(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Issue or Request Notes</label>
              <textarea
                className="form-control"
                rows={5}
                style={{
                  backgroundColor: '#2A2740',
                  border: '1px solid #3A3652',
                  borderRadius: 12,
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  resize: 'none',
                }}
                placeholder="Describe the problem, symptoms, or what you want checked."
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
              />
            </div>

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 pt-2">
              <div className="small wt-text-muted">
                The shop will review your request and move it through confirmed, in progress, and completed stages.
              </div>
              <button type="submit" className="btn btn-wt-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Request Work Order'}
              </button>
            </div>
          </form>

          {createdWorkOrder?.id && (
            <div
              className="rounded-4 p-3 mt-4"
              style={{
                backgroundColor: '#2A2740',
                border: '1px solid #3A3652',
              }}
            >
              <div className="text-white mb-1">Request created</div>
              <div className="wt-text-muted small mb-3">
                Track status changes from your dashboard.
              </div>
              <div className="d-flex gap-2">
                <Link to="/dashboard" className="btn btn-sm btn-wt-primary">
                  Go to Dashboard
                </Link>
                <Link to={`/shop/${storeId}`} className="btn btn-sm btn-wt-outline">
                  Back to Shop
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
