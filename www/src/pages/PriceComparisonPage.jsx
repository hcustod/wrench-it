import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuStar, LuMapPin, LuBadgeCheck, LuArrowRight } from 'react-icons/lu';
import { compareStoresByService, listCompareServices } from '../api/stores.js';

function formatPrice(price) {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    return 'Call';
  }
  if (Number.isInteger(price)) {
    return `$${price}`;
  }
  return `$${price.toFixed(2)}`;
}

export default function PriceComparisonPage() {
  const [serviceOptions, setServiceOptions] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [comparisonRows, setComparisonRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      try {
        const response = await listCompareServices();
        if (cancelled) return;

        const names = (response ?? [])
          .map((item) => (typeof item?.name === 'string' ? item.name.trim() : ''))
          .filter(Boolean);

        setServiceOptions(names);
        if (names.length > 0) {
          setSelectedService(names[0]);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load services.');
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedService) {
      setComparisonRows([]);
      return;
    }

    let cancelled = false;

    async function loadComparison() {
      setLoading(true);
      setError('');
      try {
        const response = await compareStoresByService(selectedService);
        if (cancelled) return;

        const rows = (response?.stores ?? []).map((store) => ({
          id: store.id,
          name: store.name,
          location: store.location,
          rating: typeof store.rating === 'number' ? store.rating : 0,
          reviewCount: typeof store.reviewCount === 'number' ? store.reviewCount : 0,
          price: typeof store.price === 'number' ? store.price : null,
          distanceLabel: '—',
          hasVerifiedMechanic: Boolean(store.hasVerifiedMechanic),
        }));

        setComparisonRows(rows);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load comparison.');
        setComparisonRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadComparison();

    return () => {
      cancelled = true;
    };
  }, [selectedService]);

  const sortedRows = useMemo(() => {
    const rows = [...comparisonRows];
    rows.sort((a, b) => {
      const ap = a.price == null ? Number.POSITIVE_INFINITY : a.price;
      const bp = b.price == null ? Number.POSITIVE_INFINITY : b.price;
      return ap - bp;
    });
    return rows;
  }, [comparisonRows]);

  return (
    <>
      {/* Page Header */}
      <section className="mb-4">
        <div className="mb-2">
          <h1 className="mb-1">Compare Prices</h1>
          <p className="wt-text-muted mb-0">
            Find the best deal for your service across nearby shops.
          </p>
        </div>
      </section>

      {/* Service Selection */}
      <section className="mb-4">
        <div className="wt-card">
          <label className="d-block text-white mb-2 small">Select Service</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="form-select wt-input"
            style={{ maxWidth: '18rem' }}
            disabled={serviceOptions.length === 0}
          >
            {serviceOptions.length === 0 ? (
              <option value="">No services available</option>
            ) : (
              serviceOptions.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))
            )}
          </select>
          {error && (
            <p className="small mt-2 mb-0" style={{ color: '#FF8C42' }}>
              {error}
            </p>
          )}
        </div>
      </section>

      {/* Comparison Table */}
      <section>
        <div className="wt-card p-0">
          <div
            className="px-4 px-md-5 py-3"
            style={{ backgroundColor: '#2A2740', borderBottom: '2px solid rgba(255,140,66,0.3)' }}
          >
            <h2 className="h5 text-white mb-1">
              Price Comparison for: {selectedService || '—'}
            </h2>
            <p className="wt-text-muted mb-0 small">
              {loading ? 'Loading...' : (
                <>
                  Showing {sortedRows.length} shop
                  {sortedRows.length === 1 ? '' : 's'} with this service
                </>
              )}
            </p>
          </div>

          <div className="table-responsive">
            <table
              className="w-100 mb-0"
              style={{ borderCollapse: 'collapse' }}
            >
              <thead
                style={{ backgroundColor: '#2A2740', borderBottom: '1px solid #3A3652' }}
              >
                <tr className="small text-white">
                  <th className="px-4 py-3 text-start">Shop Name</th>
                  <th className="px-4 py-3 text-start">Price</th>
                  <th className="px-4 py-3 text-start">Rating</th>
                  <th className="px-4 py-3 text-start">Distance</th>
                  <th className="px-4 py-3 text-start">Verified</th>
                  <th className="px-4 py-3 text-start" />
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#242133' }}>
                {sortedRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="small"
                    style={{
                      borderBottom:
                        idx !== sortedRows.length - 1 ? '1px solid #3A3652' : 'none',
                      backgroundColor: idx === 0 ? '#2A2740' : 'transparent',
                      borderLeft: idx === 0 ? '4px solid #FF8C42' : '4px solid transparent',
                    }}
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="d-flex flex-column">
                        <div className="d-flex align-items-center gap-2">
                          <span className="text-white">{row.name}</span>
                          {idx === 0 && (
                            <span
                              style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: '0.75rem',
                                backgroundColor: '#FF8C42',
                                color: '#ffffff',
                                fontSize: '0.7rem',
                              }}
                            >
                              Best Price
                            </span>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-1 wt-text-muted small mt-1">
                          <LuMapPin size={12} />
                          <span>{row.location}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-white fw-semibold">{formatPrice(row.price)}</span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="d-flex align-items-center gap-2">
                        <div className="d-flex align-items-center gap-1">
                          <LuStar size={16} style={{ color: '#FF8C42', fill: '#FF8C42' }} />
                          <span className="text-white">
                            {typeof row.rating === 'number' ? row.rating.toFixed(1) : '–'}
                          </span>
                        </div>
                        <span className="wt-text-muted small">
                          ({row.reviewCount ?? 0})
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle wt-text-muted">
                      {row.distanceLabel}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {row.hasVerifiedMechanic && (
                        <div className="d-flex align-items-center gap-1" style={{ color: '#FF8C42' }}>
                          <LuBadgeCheck size={16} />
                          <span className="small">Verified</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link
                        to={`/shop/${row.id}`}
                        className="btn btn-sm btn-wt-primary d-inline-flex align-items-center gap-2"
                      >
                        <span>View Shop</span>
                        <LuArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!loading && sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 wt-text-muted small">
                      No comparison data found for this service.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Info Box */}
      <section className="mt-4">
        <div
          className="wt-card"
          style={{
            backgroundColor: 'rgba(255,140,66,0.1)',
            borderColor: 'rgba(255,140,66,0.3)',
          }}
        >
          <h3 className="h6 text-white mb-2">Price Comparison Tips</h3>
          <ul className="mb-0 wt-text-muted small">
            <li>• Prices may vary based on your specific vehicle make and model.</li>
            <li>• Call shops directly to confirm final pricing before booking.</li>
            <li>• Look for shops with verified mechanic badges for added trust.</li>
            <li>• Consider both price and ratings when making your decision.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
