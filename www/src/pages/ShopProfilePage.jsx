import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuStar, LuMapPin, LuPhone, LuClock, LuArrowRight } from 'react-icons/lu';
import { mockShops, mockServices, mockReviews } from '../data/mockData.js';
import ReviewCard from '../components/review/ReviewCard.jsx';

function getShopById(id) {
  return mockShops.find((s) => s.id === id) ?? mockShops[0];
}

function getServicesByShopId(id) {
  return mockServices.filter((svc) => svc.shopId === id);
}

function getReviewsByShopId(id) {
  return mockReviews.filter((rev) => rev.shopId === id);
}

export default function ShopProfilePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  const shop = getShopById(id);
  const services = getServicesByShopId(shop.id);
  const reviews = getReviewsByShopId(shop.id);

  const customerReviews = reviews.filter((r) => !r.isMechanicReview);
  const mechanicReviews = reviews.filter((r) => r.isMechanicReview);

  const fullStars = Math.floor(shop.rating ?? 0);

  return (
    <>
      {/* Shop Header */}
      <section className="mb-4">
        <div className="wt-card">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-4">
            <div className="flex-grow-1">
              <h1 className="mb-3">{shop.name}</h1>

              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <LuStar
                        key={idx}
                        size={20}
                        style={
                          idx < fullStars
                            ? { color: '#FF8C42', fill: '#FF8C42' }
                            : { color: '#3A3652' }
                        }
                      />
                    ))}
                  </div>
                  <span className="text-white">{shop.rating.toFixed(1)}</span>
                </div>
                <span className="wt-text-muted small">({shop.reviewCount} reviews)</span>
              </div>

              <div className="d-flex flex-column gap-2 wt-text-muted small">
                <div className="d-flex align-items-center gap-2">
                  <LuMapPin size={18} />
                  <span>{shop.address ?? shop.location}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <LuPhone size={18} />
                  <span>{shop.phone ?? '(555) 555-5555'}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <LuClock size={18} />
                  <span>Open • Closes at 6:00 PM</span>
                </div>
              </div>
            </div>

            <div className="d-flex flex-column gap-2">
              <button type="button" className="btn btn-wt-primary">
                Call Shop
              </button>
              <button type="button" className="btn btn-wt-orange">
                Get Directions
              </button>
              <Link
                to="/write-review"
                className="btn btn-sm btn-wt-outline text-center"
              >
                Write Review
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs container */}
      <section>
        <div className="wt-card p-0">
          {/* Tabs */}
          <div
            className="d-flex"
            style={{ borderBottom: '1px solid #3A3652' }}
          >
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'services', label: 'Services' },
              { id: 'reviews', label: 'Reviews' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-grow-1 border-0 bg-transparent px-4 px-md-5 py-3"
                  style={{
                    color: isActive ? '#FF8C42' : '#C5C3DA',
                    borderBottom: isActive ? '2px solid #FF8C42' : '2px solid transparent',
                    backgroundColor: isActive ? '#2A2740' : 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-4 p-md-5">
            {activeTab === 'overview' && (
              <div className="d-flex flex-column gap-4">
                {/* About */}
                <div>
                  <h3 className="h5 text-white mb-3">About This Shop</h3>
                  <p className="wt-text-muted mb-0">
                    {shop.description ??
                      'Local independent repair shop providing diagnostics, maintenance, and repairs with transparent communication and fair pricing.'}
                  </p>
                </div>

                {/* Hours */}
                <div>
                  <h3 className="h5 text-white mb-3">Hours of Operation</h3>
                  <div
                    className="rounded-4 p-3 p-md-4"
                    style={{ backgroundColor: '#2A2740', border: '1px solid #3A3652' }}
                  >
                    {Object.entries(shop.hours ?? {}).map(([day, hours], idx, arr) => (
                      <div
                        key={day}
                        className="d-flex justify-content-between py-1 small"
                        style={{
                          borderBottom:
                            idx !== arr.length - 1 ? '1px solid #3A3652' : 'none',
                        }}
                      >
                        <span className="text-white">{day}</span>
                        <span className="wt-text-muted">{hours}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location map placeholder */}
                <div>
                  <h3 className="h5 text-white mb-3">Location</h3>
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: '#2A2740', border: '1px solid #3A3652', height: '16rem' }}
                  >
                    <div className="text-center">
                      <LuMapPin className="wt-text-muted mb-2" size={40} />
                      <p className="wt-text-muted mb-0">Map showing shop location</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h5 text-white mb-0">Services &amp; Pricing</h3>
                  <Link
                    to="/compare"
                    className="d-flex align-items-center gap-1"
                    style={{ color: '#FF8C42', textDecoration: 'none' }}
                  >
                    <span className="small">Compare Prices</span>
                    <LuArrowRight size={16} />
                  </Link>
                </div>

                <div
                  className="rounded-4 overflow-hidden"
                  style={{ backgroundColor: '#2A2740', border: '1px solid #3A3652' }}
                >
                  <table
                    className="w-100 mb-0"
                    style={{ borderCollapse: 'collapse' }}
                  >
                    <thead
                      style={{ backgroundColor: '#242133', borderBottom: '1px solid #3A3652' }}
                    >
                      <tr className="small text-white">
                        <th className="px-4 py-3 text-start">Service</th>
                        <th className="px-4 py-3 text-start">Price</th>
                        <th className="px-4 py-3 text-start">Duration</th>
                        <th className="px-4 py-3 text-start">Category</th>
                        <th className="px-4 py-3 text-start" />
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((svc, idx) => (
                        <tr
                          key={svc.id}
                          className="small"
                          style={{
                            borderBottom:
                              idx !== services.length - 1 ? '1px solid #3A3652' : 'none',
                          }}
                        >
                          <td className="px-4 py-3 text-white">{svc.name}</td>
                          <td className="px-4 py-3 text-white">${svc.price}</td>
                          <td className="px-4 py-3 wt-text-muted">
                            {svc.duration}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '0.75rem',
                                backgroundColor: 'rgba(255,140,66,0.18)',
                                border: '1px solid rgba(255,140,66,0.4)',
                                color: '#FF8C42',
                                fontSize: '0.8rem',
                              }}
                            >
                              {svc.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to="/compare"
                              className="small"
                              style={{ color: '#FF8C42', textDecoration: 'none' }}
                            >
                              Compare
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="d-flex flex-column gap-4">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h3 className="h5 text-white mb-0">Client Reviews</h3>
                    <Link
                      to="/write-review"
                      className="btn btn-sm btn-wt-outline"
                    >
                      Write Review
                    </Link>
                  </div>
                  <div className="d-flex flex-column gap-3">
                    {customerReviews.map((rev) => (
                      <ReviewCard key={rev.id} {...rev} />
                    ))}
                  </div>
                </div>

                <div className="pt-3" style={{ borderTop: '2px solid rgba(255,140,66,0.3)' }}>
                  <h3 className="h6 text-white mb-3">Verified Mechanic Reviews</h3>
                  <div className="d-flex flex-column gap-3">
                    {mechanicReviews.map((rev) => (
                      <ReviewCard key={rev.id} {...rev} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

