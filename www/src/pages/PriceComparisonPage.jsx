import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuStar, LuMapPin, LuBadgeCheck, LuArrowRight } from 'react-icons/lu';
import { mockShops, mockServices } from '../data/mockData.js';

function getComparisonRows(selectedServiceId) {
  const selectedSvc = mockServices.find((s) => s.id === selectedServiceId) ?? mockServices[0];
  if (!selectedSvc) return [];

  // Services with the same name represent the comparable service across shops
  const relatedServices = mockServices.filter((s) => s.name === selectedSvc.name);

  const rows = relatedServices
    .map((svc, idx) => {
      const shop = mockShops.find((s) => s.id === svc.shopId);
      if (!shop) return null;

      // Simple mock distance and verification for now
      const distanceMiles = 1 + idx * 2;
      const hasVerifiedMechanic = (shop.rating ?? 0) >= 4.8;

      return {
        id: shop.id,
        name: shop.name,
        location: shop.location,
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        price: svc.price,
        distanceLabel: `${distanceMiles.toFixed(1)} mi`,
        hasVerifiedMechanic,
      };
    })
    .filter(Boolean);

  // Sort by price ascending
  rows.sort((a, b) => a.price - b.price);

  return rows;
}

export default function PriceComparisonPage() {
  const [selectedServiceId, setSelectedServiceId] = useState(
    mockServices[0]?.id ?? '',
  );

  const comparisonRows = useMemo(
    () => getComparisonRows(selectedServiceId),
    [selectedServiceId],
  );

  const selectedService = mockServices.find((s) => s.id === selectedServiceId) ?? mockServices[0];

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
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="form-select wt-input"
            style={{ maxWidth: '18rem' }}
          >
            {mockServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
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
              Price Comparison for: {selectedService?.name}
            </h2>
            <p className="wt-text-muted mb-0 small">
              Showing {comparisonRows.length} shop
              {comparisonRows.length === 1 ? '' : 's'} with this service
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
                {comparisonRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="small"
                    style={{
                      borderBottom:
                        idx !== comparisonRows.length - 1 ? '1px solid #3A3652' : 'none',
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
                      <span className="text-white fw-semibold">${row.price}</span>
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

