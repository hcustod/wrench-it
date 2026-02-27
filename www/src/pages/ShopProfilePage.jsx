import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuStar, LuMapPin, LuPhone, LuClock, LuArrowRight } from 'react-icons/lu';
import { getStore, listStoreServices } from '../api/stores.js';
import { listReviews } from '../api/reviews.js';
import ReviewCard from '../components/review/ReviewCard.jsx';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function normalizeStore(store) {
  return {
    ...store,
    rating: typeof store?.rating === 'number' ? store.rating : 0,
    reviewCount: typeof store?.ratingCount === 'number' ? store.ratingCount : 0,
    location:
      store?.city && store?.state
        ? `${store.city}, ${store.state}`
        : store?.address ?? 'Location unavailable',
  };
}

function formatHoursWindow(hours) {
  if (!hours || typeof hours !== 'object') return null;
  const open = typeof hours.open === 'string' ? hours.open : '';
  const close = typeof hours.close === 'string' ? hours.close : '';
  if (!open && !close) return null;
  if (open === 'Closed') return 'Closed';
  return close ? `${open} - ${close}` : open;
}

function resolveMapsApiKey() {
  const fromRuntime = window.WRENCHIT_CONFIG?.googleMapsApiKey;
  if (fromRuntime && fromRuntime.trim()) return fromRuntime.trim();
  const fromVite = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (fromVite && fromVite.trim()) return fromVite.trim();
  return '';
}

async function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return;
  if (!apiKey) throw new Error('Google Maps API key is missing.');

  if (!window.__wrenchitGoogleMapsLoader) {
    window.__wrenchitGoogleMapsLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
      document.head.appendChild(script);
    });
  }

  await window.__wrenchitGoogleMapsLoader;
}

export default function ShopProfilePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [mechanicReviews, setMechanicReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapStatus, setMapStatus] = useState('');
  const mapHostRef = useRef(null);
  const mapRef = useRef(null);
  const mapMarkerRef = useRef(null);
  const mapsApiKey = useMemo(() => resolveMapsApiKey(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [storeRes, servicesRes, reviewsRes] = await Promise.all([
          getStore(id),
          listStoreServices(id),
          listReviews(id),
        ]);
        if (cancelled) return;

        setShop(normalizeStore(storeRes));
        setServices(servicesRes ?? []);

        const apiReviews = (reviewsRes ?? []).map((rev) => ({
          id: rev.id,
          reviewerName: 'Customer',
          rating: Number(rev.rating ?? 0),
          reviewText: rev.comment,
          isVerified: true,
          isMechanicReview: false,
          date: formatDate(rev.createdAt),
        }));
        setCustomerReviews(apiReviews);
        setMechanicReviews([]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load shop details.');
        setShop(null);
        setServices([]);
        setCustomerReviews([]);
        setMechanicReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  const hoursRows = useMemo(() => {
    if (!shop?.hours || typeof shop.hours !== 'object') {
      return [];
    }

    return Object.entries(shop.hours)
      .map(([day, value]) => ({
        day,
        value:
          typeof value === 'string'
            ? value
            : formatHoursWindow(value),
      }))
      .filter((item) => item.value);
  }, [shop]);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (activeTab !== 'overview' || !mapHostRef.current) return;
      if (shop?.lat == null || shop?.lng == null) {
        setMapStatus('Shop location coordinates are unavailable.');
        return;
      }
      if (!mapsApiKey) {
        setMapStatus('Google Maps key is missing. Add it to www/public/config.js and rebuild the www container.');
        return;
      }

      setMapStatus('Loading map...');
      try {
        await loadGoogleMaps(mapsApiKey);
        if (disposed) return;

        const center = { lat: Number(shop.lat), lng: Number(shop.lng) };
        if (!mapRef.current || mapRef.current.getDiv?.() !== mapHostRef.current) {
          mapRef.current = new window.google.maps.Map(mapHostRef.current, {
            center,
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        } else {
          mapRef.current.setCenter(center);
        }

        if (mapMarkerRef.current) {
          mapMarkerRef.current.setMap(null);
        }
        mapMarkerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          position: center,
          title: shop.name || 'Shop',
        });
        setMapStatus('');
      } catch {
        if (!disposed) {
          setMapStatus('Could not load Google Maps API. Check key, billing, and localhost referrer restrictions.');
        }
      }
    }

    initMap();
    return () => {
      disposed = true;
    };
  }, [activeTab, shop?.lat, shop?.lng, shop?.name, mapsApiKey]);

  if (loading && !shop) {
    return (
      <section className="mb-4">
        <p className="wt-text-muted mb-0">Loading shop details…</p>
      </section>
    );
  }

  if (!shop) {
    return (
      <section className="mb-4">
        <p className="wt-text-muted mb-0">Shop not found.</p>
      </section>
    );
  }

  const fullStars = Math.floor(shop.rating ?? 0);
  const hasCoordinates = shop?.lat != null && shop?.lng != null;

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
                  <span className="text-white">{Number(shop.rating ?? 0).toFixed(1)}</span>
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
                  <span>
                    {hoursRows.length > 0 ? 'See hours below' : 'Hours information unavailable'}
                  </span>
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
                to={`/write-review?storeId=${shop.id}`}
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
            {error && (
              <div className="small mb-3" style={{ color: '#FF8C42' }}>
                {error}
              </div>
            )}
            {activeTab === 'overview' && (
              <div className="d-flex flex-column gap-4">
                {/* About */}
                <div>
                  <h3 className="h5 text-white mb-3">About This Shop</h3>
                  <p className="wt-text-muted mb-0">
                    {shop.description ??
                      'Shop profile details are sourced from live store data.'}
                  </p>
                </div>

                {/* Hours */}
                <div>
                  <h3 className="h5 text-white mb-3">Hours of Operation</h3>
                  <div
                    className="rounded-4 p-3 p-md-4"
                    style={{ backgroundColor: '#2A2740', border: '1px solid #3A3652' }}
                  >
                    {hoursRows.map((item, idx) => (
                      <div
                        key={item.day}
                        className="d-flex justify-content-between py-1 small"
                        style={{
                          borderBottom:
                            idx !== hoursRows.length - 1 ? '1px solid #3A3652' : 'none',
                        }}
                      >
                        <span className="text-white">{item.day}</span>
                        <span className="wt-text-muted">{item.value}</span>
                      </div>
                    ))}
                    {hoursRows.length === 0 && (
                      <p className="wt-text-muted small mb-0">Hours not available.</p>
                    )}
                  </div>
                </div>

                {/* Location map */}
                <div>
                  <h3 className="h5 text-white mb-3">Location</h3>
                  <div style={{ position: 'relative' }}>
                    <div
                      ref={mapHostRef}
                      className="rounded-4"
                      style={{ backgroundColor: '#2A2740', border: '1px solid #3A3652', height: '16rem' }}
                    />
                    {mapStatus && (
                      <div
                        className="rounded-4 d-flex align-items-center justify-content-center"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(42, 39, 64, 0.92)',
                        }}
                      >
                        <p className="wt-text-muted mb-0 px-3 text-center">{mapStatus}</p>
                      </div>
                    )}
                    {!mapStatus && !hasCoordinates && (
                      <div
                        className="rounded-4 d-flex align-items-center justify-content-center"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(42, 39, 64, 0.92)',
                        }}
                      >
                        <div className="text-center">
                          <LuMapPin className="wt-text-muted mb-2" size={40} />
                          <p className="wt-text-muted mb-0">Map showing shop location</p>
                        </div>
                      </div>
                    )}
                    {hasCoordinates ? (
                      <div className="small wt-text-muted mt-2">
                        {Number(shop.lat).toFixed(6)}, {Number(shop.lng).toFixed(6)}
                      </div>
                    ) : (
                      <div className="small wt-text-muted mt-2">
                        Coordinates unavailable for this shop.
                      </div>
                    )}
                    <div className="small wt-text-muted mt-1">
                      {shop.address ?? shop.location}
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
                          <td className="px-4 py-3 text-white">
                            {typeof svc.price === 'number' ? `$${svc.price}` : 'Call'}
                          </td>
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
                      {services.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 wt-text-muted small">
                            No services listed for this shop.
                          </td>
                        </tr>
                      )}
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
                      to={`/write-review?storeId=${shop.id}`}
                      className="btn btn-sm btn-wt-outline"
                    >
                      Write Review
                    </Link>
                  </div>
                  <div className="d-flex flex-column gap-3">
                    {customerReviews.map((rev) => (
                      <ReviewCard key={rev.id} {...rev} />
                    ))}
                    {customerReviews.length === 0 && (
                      <p className="wt-text-muted small mb-0">No reviews yet.</p>
                    )}
                  </div>
                </div>

                <div className="pt-3" style={{ borderTop: '2px solid rgba(255,140,66,0.3)' }}>
                  <h3 className="h6 text-white mb-3">Verified Mechanic Reviews</h3>
                  <div className="d-flex flex-column gap-3">
                    {mechanicReviews.map((rev) => (
                      <ReviewCard key={rev.id} {...rev} />
                    ))}
                    {mechanicReviews.length === 0 && (
                      <p className="wt-text-muted small mb-0">No mechanic reviews yet.</p>
                    )}
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
