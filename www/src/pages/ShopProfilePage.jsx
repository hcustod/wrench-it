import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuArrowRight, LuClock, LuMapPin, LuPhone, LuShield, LuStar, LuX } from 'react-icons/lu';
import { getStore, listStoreServices } from '../api/stores.js';
import { listReviews } from '../api/reviews.js';
import { listSavedShopsIfAuthenticated, saveShop, unsaveShop } from '../api/saved.js';
import ReviewCard from '../components/review/ReviewCard.jsx';
import { loadGoogleMaps, resolveMapsApiKey } from '../lib/googleMaps.js';

const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

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

function buildAddressLabel(shop, includeCountry = false) {
  return [
    shop?.address,
    shop?.city,
    shop?.state,
    shop?.postalCode,
    includeCountry ? shop?.country : null,
  ].filter(Boolean).join(', ') || shop?.location || 'Location unavailable';
}

function normalizeWebsite(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function pickReviewerName(review) {
  if (typeof review?.reviewerName === 'string' && review.reviewerName.trim()) {
    return review.reviewerName.trim();
  }
  if (typeof review?.displayName === 'string' && review.displayName.trim()) {
    return review.displayName.trim();
  }
  if (typeof review?.authorName === 'string' && review.authorName.trim()) {
    return review.authorName.trim();
  }
  return 'Customer';
}

function joinNaturalList(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function buildShopBlurb(shop, highlights) {
  const name = shop?.name || 'This shop';
  const location = shop?.city && shop?.state
    ? `${shop.city}, ${shop.state}`
    : (shop?.location || 'the local area');
  const servicesText = String(shop?.servicesText || '').toLowerCase();
  const topHighlights = highlights.filter(Boolean).slice(0, 3);

  const intro = typeof shop?.rating === 'number' && shop.rating > 0 && typeof shop?.reviewCount === 'number' && shop.reviewCount > 0
    ? `${name} is one of the stronger-rated options in ${location}, holding ${shop.rating.toFixed(1)} stars across ${shop.reviewCount} reviews.`
    : `${name} stands out as a dependable option in ${location} for drivers who want a straightforward place to get work done.`;

  const services = topHighlights.length > 0
    ? `${name} is especially worth a look for ${joinNaturalList(topHighlights).toLowerCase()}, with more listed service coverage and pricing shown below.`
    : `${name} looks geared toward practical everyday repair, inspection, and maintenance work rather than a bloated service menu.`;

  let closer = `${name} comes across as an easy shop to shortlist if you want clear location, service, and review information in one place.`;
  if (servicesText.includes('mobile')) {
    closer = `${name} looks particularly useful if you want flexible mobile help without restarting your search from scratch.`;
  } else if (servicesText.includes('collision') || servicesText.includes('paint') || servicesText.includes('glass')) {
    closer = `${name} looks especially relevant for specialty body, glass, or collision work where convenience and trust matter.`;
  } else if (servicesText.includes('oil') || servicesText.includes('brake') || servicesText.includes('diagnostic')) {
    closer = `${name} looks like a strong fit for routine maintenance and quick issue-checking when you just need the basics handled well.`;
  }

  return `${intro} ${services} ${closer}`;
}

function syncMapInstance(host, mapRef, markerRef, center, title, zoom) {
  if (!host || !window.google?.maps || !center) return;

  if (!mapRef.current || mapRef.current.getDiv?.() !== host) {
    mapRef.current = new window.google.maps.Map(host, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'cooperative',
      clickableIcons: false,
    });
  } else {
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(zoom);
  }

  if (markerRef.current) {
    markerRef.current.setMap(null);
  }

  markerRef.current = new window.google.maps.Marker({
    map: mapRef.current,
    position: center,
    title: title || 'Shop',
  });
}

function buildDirectionsUrl(shop, resolvedCoords) {
  const lat = resolvedCoords?.lat ?? shop?.lat;
  const lng = resolvedCoords?.lng ?? shop?.lng;
  if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
    return `https://www.google.com/maps/dir/?api=1&destination=${Number(lat)},${Number(lng)}`;
  }

  const address = buildAddressLabel(shop, true);
  if (!address) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function ShopProfilePage() {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [mapStatus, setMapStatus] = useState('');
  const [resolvedCoords, setResolvedCoords] = useState(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const inlineMapHostRef = useRef(null);
  const expandedMapHostRef = useRef(null);
  const inlineMapRef = useRef(null);
  const expandedMapRef = useRef(null);
  const inlineMapMarkerRef = useRef(null);
  const expandedMapMarkerRef = useRef(null);
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

        // Normalize review shape here so the card component can stay dumb and presentation-focused.
        const apiReviews = (reviewsRes ?? []).map((review) => ({
          id: review.id,
          reviewerName: pickReviewerName(review),
          rating: Number(review.rating ?? 0),
          reviewText: review.comment,
          ownerResponse: review.ownerResponse ?? '',
          ownerResponseBy: review.ownerResponseBy ?? 'Shop Owner',
          verificationStatus: review.verificationStatus ?? 'UNVERIFIED',
          date: formatDate(review.createdAt),
        }));
        setCustomerReviews(apiReviews);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load shop details.');
        setShop(null);
        setServices([]);
        setCustomerReviews([]);
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

  useEffect(() => {
    let cancelled = false;

    async function loadSavedState() {
      if (!id) return;
      try {
        const saved = await listSavedShopsIfAuthenticated();
        if (saved == null) {
          if (!cancelled) setIsSaved(false);
          return;
        }

        if (cancelled) return;
        setIsSaved((saved ?? []).some((entry) => entry?.store?.id === id));
      } catch {
        if (!cancelled) {
          setIsSaved(false);
        }
      }
    }

    loadSavedState();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const hoursRows = useMemo(() => DAY_ORDER
    .map((day) => {
      const value = shop?.hours?.[day];
      return {
        day,
        value: typeof value === 'string' ? value : formatHoursWindow(value),
      };
    })
    .filter((item) => item.value), [shop?.hours]);

  const fallbackServiceTags = useMemo(
    () =>
      String(shop?.servicesText || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [shop?.servicesText],
  );

  const serviceHighlights = useMemo(() => {
    const structured = services
      .map((service) => service?.name)
      .filter(Boolean);
    return (structured.length > 0 ? structured : fallbackServiceTags).slice(0, 6);
  }, [fallbackServiceTags, services]);

  useEffect(() => {
    if (!isMapExpanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMapExpanded]);

  useEffect(() => {
    let cancelled = false;

    async function ensureMap() {
      if (!shop) return;
      if (!inlineMapHostRef.current) return;

      if (!mapsApiKey) {
        setResolvedCoords(null);
        setMapStatus('Add a Google Maps API key in `www/public/config.js` to render the live map for this shop.');
        return;
      }

      try {
        setMapStatus('Loading map...');
        await loadGoogleMaps(mapsApiKey);
        if (cancelled) return;

        let center = null;
        if (shop.lat != null && shop.lng != null) {
          center = { lat: Number(shop.lat), lng: Number(shop.lng) };
        } else {
          // Older or imported shops may only have an address, so geocode on the fly for the profile map.
          const address = buildAddressLabel(shop, true);
          if (!address) {
            setResolvedCoords(null);
            setMapStatus('Shop location coordinates are unavailable.');
            return;
          }

          setMapStatus('Resolving location...');
          const geocoder = new window.google.maps.Geocoder();
          center = await new Promise((resolve) => {
            geocoder.geocode({ address }, (results, status) => {
              if (status === 'OK' && Array.isArray(results) && results[0]?.geometry?.location) {
                const point = results[0].geometry.location;
                resolve({ lat: point.lat(), lng: point.lng() });
                return;
              }

              resolve(null);
            });
          });

          if (cancelled) return;

          if (!center) {
            setResolvedCoords(null);
            setMapStatus('Unable to resolve this shop address on Google Maps.');
            return;
          }
        }

        if (cancelled) return;

        setResolvedCoords(center);
        setMapStatus('');
        syncMapInstance(
          inlineMapHostRef.current,
          inlineMapRef,
          inlineMapMarkerRef,
          center,
          shop.name,
          14,
        );

        if (isMapExpanded && expandedMapHostRef.current) {
          syncMapInstance(
            expandedMapHostRef.current,
            expandedMapRef,
            expandedMapMarkerRef,
            center,
            shop.name,
            15,
          );
        }
      } catch {
        if (!cancelled) {
          setResolvedCoords(null);
          setMapStatus('Could not load Google Maps API. Check key, billing, and localhost referrer restrictions.');
        }
      }
    }

    void ensureMap();

    return () => {
      cancelled = true;
    };
  }, [
    isMapExpanded,
    mapsApiKey,
    shop,
  ]);

  const handleToggleSaveShop = useCallback(async () => {
    if (!shop?.id || savingShop) return;

    setSavingShop(true);
    setSaveMessage('');
    try {
      if (isSaved) {
        await unsaveShop(shop.id);
        setIsSaved(false);
        setSaveMessage('Shop removed from saved list.');
      } else {
        await saveShop(shop.id);
        setIsSaved(true);
        setSaveMessage('Shop saved to your dashboard.');
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 401) {
        setSaveMessage('Sign in to save shops.');
      } else {
        setSaveMessage(err instanceof Error ? err.message : 'Unable to update saved shop.');
      }
    } finally {
      setSavingShop(false);
    }
  }, [shop, savingShop, isSaved]);

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

  const fullStars = Math.round(shop.rating ?? 0);
  const averageRatingLabel = shop.reviewCount > 0 ? Number(shop.rating ?? 0).toFixed(1) : 'New';
  const reviewCountLabel = `${shop.reviewCount} ${shop.reviewCount === 1 ? 'review' : 'reviews'}`;
  const hasCoordinates = resolvedCoords?.lat != null && resolvedCoords?.lng != null;
  const displayAddress = buildAddressLabel(shop, false);
  const directionsUrl = buildDirectionsUrl(shop, resolvedCoords);
  const dialPhone = typeof shop.phone === 'string'
    ? shop.phone.replace(/[^\d+]/g, '')
    : '';
  const websiteUrl = normalizeWebsite(shop.website);
  const aboutText = typeof shop.description === 'string' && shop.description.trim()
    ? shop.description.trim()
    : buildShopBlurb(shop, serviceHighlights);

  return (
    <>
      <section className="wt-shop-page">
        <div className="wt-shop-hero-card">
          <div className="wt-shop-hero-grid">
            <div className="wt-shop-hero-copy">
              <span className="wt-home-section-label">Shop Profile</span>
              <h1 className="wt-shop-title">{shop.name}</h1>

              <div className="wt-shop-rating-row">
                <div className="d-flex align-items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <LuStar
                      key={`star-${index}`}
                      size={18}
                      style={
                        index < fullStars
                          ? { color: 'var(--wt-warning)', fill: 'var(--wt-warning)' }
                          : { color: 'var(--wt-border-strong)' }
                      }
                    />
                  ))}
                </div>
                <strong>{averageRatingLabel}</strong>
                <span className="wt-text-muted small">{reviewCountLabel}</span>
              </div>

              <div className="wt-shop-pill-row">
                <span className="wt-shop-info-pill">
                  <LuMapPin size={16} />
                  <span>{shop.location}</span>
                </span>
                <span className="wt-shop-info-pill">
                  <LuClock size={16} />
                  <span>{hoursRows.length > 0 ? 'Hours listed below' : 'Hours not listed'}</span>
                </span>
                <span className="wt-shop-info-pill">
                  <LuShield size={16} />
                  <span>Receipt-backed reviews supported</span>
                </span>
              </div>

              <p className="wt-shop-summary mb-0">{aboutText}</p>

              <div className="wt-shop-stat-grid">
                <div className="wt-shop-stat-card">
                  <span className="wt-shop-stat-label">Price band</span>
                  <strong>{shop.priceRange ?? 'N/A'}</strong>
                </div>
                <div className="wt-shop-stat-card">
                  <span className="wt-shop-stat-label">Services listed</span>
                  <strong>{services.length || serviceHighlights.length || 0}</strong>
                </div>
                <div className="wt-shop-stat-card">
                  <span className="wt-shop-stat-label">Map state</span>
                  <strong>{hasCoordinates ? 'Ready' : 'Resolving'}</strong>
                </div>
              </div>

              <div className="wt-shop-action-stack">
                <Link
                  to={`/request-work-order?storeId=${shop.id}`}
                  className="btn btn-wt-primary"
                >
                  Request Work Order
                </Link>

                {dialPhone ? (
                  <a href={`tel:${dialPhone}`} className="btn btn-wt-orange">
                    Call Shop
                  </a>
                ) : (
                  <button type="button" className="btn btn-wt-orange" disabled>
                    Phone unavailable
                  </button>
                )}

                {directionsUrl ? (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-wt-outline"
                  >
                    Get Directions
                  </a>
                ) : (
                  <button type="button" className="btn btn-wt-outline" disabled>
                    Get Directions
                  </button>
                )}

                <Link to={`/write-review?storeId=${shop.id}`} className="btn btn-wt-outline">
                  Write Review
                </Link>

                <button
                  type="button"
                  className="btn btn-wt-outline"
                  onClick={handleToggleSaveShop}
                  disabled={savingShop}
                >
                  {savingShop ? 'Saving...' : isSaved ? 'Saved to Dashboard' : 'Save Shop'}
                </button>
              </div>

              {saveMessage && (
                <div className="wt-shop-inline-note">
                  {saveMessage}
                </div>
              )}
            </div>

            <aside className="wt-shop-map-card">
              <div className="wt-shop-panel-heading">
                <div>
                  <span className="wt-home-section-label">Store Map</span>
                  <h2>Location at a glance</h2>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-wt-outline"
                  onClick={() => setIsMapExpanded(true)}
                  disabled={!hasCoordinates}
                >
                  Expand Map
                </button>
              </div>

              <div className="wt-shop-map-frame">
                <div ref={inlineMapHostRef} className="wt-shop-map-canvas" />
                {mapStatus && (
                  <div className="wt-shop-map-overlay">
                    <div>
                      <strong className="d-block mb-2">Map status</strong>
                      <p className="mb-0">{mapStatus}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="wt-shop-map-meta">
                <div className="wt-shop-map-meta-row">
                  <span className="wt-shop-map-meta-label">Address</span>
                  <strong>{displayAddress}</strong>
                </div>
                <div className="wt-shop-map-meta-row">
                  <span className="wt-shop-map-meta-label">Coordinates</span>
                  <strong>
                    {hasCoordinates
                      ? `${Number(resolvedCoords.lat).toFixed(5)}, ${Number(resolvedCoords.lng).toFixed(5)}`
                      : 'Not available'}
                  </strong>
                </div>
                <div className="wt-shop-map-meta-actions">
                  {directionsUrl ? (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-wt-primary"
                    >
                      Open Directions
                    </a>
                  ) : (
                    <button type="button" className="btn btn-sm btn-wt-primary" disabled>
                      Open Directions
                    </button>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {error && (
          <div className="wt-shop-inline-note">
            {error}
          </div>
        )}

        <div className="wt-shop-overview-grid">
          <section className="wt-shop-section-card">
            <div className="wt-shop-panel-heading">
              <div>
                <span className="wt-home-section-label">Overview</span>
                <h2>About this shop</h2>
              </div>
            </div>

            <p className="wt-text-muted mb-0">{aboutText}</p>

            {serviceHighlights.length > 0 && (
              <div className="mt-4">
                <h3 className="wt-shop-subheading">Service highlights</h3>
                <div className="d-flex flex-wrap gap-2">
                  {serviceHighlights.map((service) => (
                    <span key={service} className="wt-chip-service">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="wt-shop-section-card">
            <div className="wt-shop-panel-heading">
              <div>
                <span className="wt-home-section-label">Visit</span>
                <h2>Contact &amp; access</h2>
              </div>
            </div>

            <div className="wt-shop-info-list">
              <div className="wt-shop-info-row">
                <LuMapPin size={18} />
                <div>
                  <span className="wt-shop-subtle-label">Address</span>
                  <strong>{displayAddress}</strong>
                </div>
              </div>
              <div className="wt-shop-info-row">
                <LuPhone size={18} />
                <div>
                  <span className="wt-shop-subtle-label">Phone</span>
                  <strong>{shop.phone ?? 'Phone unavailable'}</strong>
                </div>
              </div>
              <div className="wt-shop-info-row">
                <LuClock size={18} />
                <div>
                  <span className="wt-shop-subtle-label">Hours status</span>
                  <strong>{hoursRows.length > 0 ? 'Business hours listed' : 'Business hours unavailable'}</strong>
                </div>
              </div>
            </div>

            <div className="wt-shop-utility-links">
              {websiteUrl ? (
                <a href={websiteUrl} target="_blank" rel="noreferrer" className="btn btn-wt-outline">
                  Visit Website
                </a>
              ) : (
                <button type="button" className="btn btn-wt-outline" disabled>
                  Website unavailable
                </button>
              )}

              {directionsUrl ? (
                <a href={directionsUrl} target="_blank" rel="noreferrer" className="btn btn-wt-primary">
                  Launch Map Directions
                </a>
              ) : (
                <button type="button" className="btn btn-wt-primary" disabled>
                  Launch Map Directions
                </button>
              )}
            </div>
          </section>

          <section className="wt-shop-section-card">
            <div className="wt-shop-panel-heading">
              <div>
                <span className="wt-home-section-label">Schedule</span>
                <h2>Hours &amp; availability</h2>
              </div>
            </div>

            {hoursRows.length > 0 ? (
              <div className="wt-shop-hours-list">
                {hoursRows.map((item) => (
                  <div key={item.day} className="wt-shop-hours-row">
                    <span>{item.day}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="wt-text-muted mb-0">
                Call {shop.name} to confirm today&apos;s hours and booking windows while the weekly schedule is still being filled in.
              </p>
            )}
          </section>
        </div>

        <section className="wt-shop-section-card">
          <div className="wt-shop-panel-heading">
            <div>
              <span className="wt-home-section-label">Services</span>
              <h2>Services &amp; pricing</h2>
            </div>
            <Link to="/compare" className="wt-shop-inline-link">
              Compare prices <LuArrowRight size={16} />
            </Link>
          </div>

          <div className="wt-shop-table-shell">
            <table className="wt-shop-data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Category</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>{service.name}</td>
                    <td>{typeof service.price === 'number' ? `$${service.price}` : 'Call'}</td>
                    <td>{service.duration ?? 'Unknown'}</td>
                    <td>
                      <span className="wt-shop-category-chip">{service.category}</span>
                    </td>
                    <td>
                      <Link to="/compare" className="wt-shop-inline-link">
                        Compare
                      </Link>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={5} className="wt-text-muted">
                      {shop.name} has not published a structured service menu yet, but the shop can still be reviewed through its location, contact details, and customer feedback above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="wt-shop-section-card">
          <div className="wt-shop-reviews-grid">
            <aside className="wt-shop-review-summary">
              <span className="wt-home-section-label">Reviews</span>
              <h2>Customer trust snapshot</h2>
              <div className="wt-shop-rating-row mb-3">
                <div className="d-flex align-items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <LuStar
                      key={`summary-star-${index}`}
                      size={18}
                      style={
                        index < fullStars
                          ? { color: 'var(--wt-warning)', fill: 'var(--wt-warning)' }
                          : { color: 'var(--wt-border-strong)' }
                      }
                    />
                  ))}
                </div>
                <strong>{averageRatingLabel}</strong>
              </div>
              <p className="wt-text-muted">
                Only reviews with approved receipt evidence are marked as verified. That gives the
                rating context instead of leaving it as anonymous star noise.
              </p>
              <Link to={`/write-review?storeId=${shop.id}`} className="btn btn-wt-outline">
                Write Review
              </Link>
            </aside>

            <div className="d-flex flex-column gap-3">
              {customerReviews.map((review) => (
                <ReviewCard key={review.id} {...review} />
              ))}
              {customerReviews.length === 0 && (
                <p className="wt-text-muted mb-0">{shop.name} has not picked up customer reviews on this profile yet.</p>
              )}
            </div>
          </div>
        </section>
      </section>

      {isMapExpanded && (
        <div className="wt-shop-map-modal" role="dialog" aria-modal="true" aria-label={`${shop.name} map`}>
          <div className="wt-shop-map-modal-backdrop" onClick={() => setIsMapExpanded(false)} />
          <div className="wt-shop-map-modal-panel">
            <div className="wt-shop-map-modal-toolbar">
              <div>
                <span className="wt-home-section-label">Expanded Map</span>
                <h2>{shop.name}</h2>
              </div>
              <button
                type="button"
                className="wt-shop-map-close"
                onClick={() => setIsMapExpanded(false)}
                aria-label="Close expanded map"
              >
                <LuX size={18} />
              </button>
            </div>

            <div className="wt-shop-map-modal-frame">
              <div ref={expandedMapHostRef} className="wt-shop-map-modal-canvas" />
              {mapStatus && (
                <div className="wt-shop-map-overlay">
                  <div>
                    <strong className="d-block mb-2">Map status</strong>
                    <p className="mb-0">{mapStatus}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="wt-shop-map-modal-footer">
              <div>
                <span className="wt-shop-subtle-label">Address</span>
                <strong>{displayAddress}</strong>
              </div>
              {directionsUrl ? (
                <a href={directionsUrl} target="_blank" rel="noreferrer" className="btn btn-wt-primary">
                  Open in Google Maps
                </a>
              ) : (
                <button type="button" className="btn btn-wt-primary" disabled>
                  Open in Google Maps
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
