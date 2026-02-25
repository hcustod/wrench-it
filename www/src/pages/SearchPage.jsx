import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuMapPin, LuSearch, LuSlidersHorizontal, LuStar } from 'react-icons/lu';
import { searchStores } from '../api/stores.js';
import ShopCard from '../components/shop/ShopCard.jsx';

const CATEGORIES = [
  'All Services',
  'Oil Change',
  'Brake Repair',
  'Engine Diagnostics',
  'Tire Service',
  'Battery Service',
  'Transmission',
  'AC Repair',
];

const DEFAULT_MAP_CENTER = { lat: 39.8283, lng: -98.5795 };

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function distanceMiles(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distanceKm * 0.621371;
}

function normalizeStore(store) {
  const location = [
    store?.address,
    store?.city,
    store?.state,
  ].filter(Boolean).join(', ');

  return {
    ...store,
    reviewCount: store?.reviewCount ?? store?.ratingCount ?? 0,
    location: store?.location ?? (location || 'Location unavailable'),
    priceRange: store?.priceRange ?? '$$',
    services: Array.isArray(store?.services)
      ? store.services
      : String(store?.servicesText || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    lat: store?.lat == null ? null : Number(store.lat),
    lng: store?.lng == null ? null : Number(store.lng),
  };
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

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLocation = searchParams.get('location') ?? 'Los Angeles, CA';
  const initialService = searchParams.get('service') ?? '';

  const [searchTerm, setSearchTerm] = useState(initialService);
  const [location, setLocation] = useState(initialLocation);

  const [distance, setDistance] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('best');

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  const [mapStatus, setMapStatus] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const mapHostRef = useRef(null);
  const mapRef = useRef(null);
  const mapMarkersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);

  const mapsApiKey = useMemo(() => resolveMapsApiKey(), []);

  function handleTopSearch(e) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (location.trim()) next.set('location', location.trim());
    if (searchTerm.trim()) next.set('service', searchTerm.trim());
    setSearchParams(next);
  }

  function handleResetFilters() {
    setDistance(10);
    setMinRating(0);
    setSelectedCategory('all');
    setPriceRange('all');
    setSortBy('best');
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setLocating(true);
    setError('');
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      const nextCoords = {
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude),
      };
      setUserCoords(nextCoords);
      setLocation('Current location');
    } catch {
      setError('Unable to access your location. Check browser permissions.');
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    const nextService = searchParams.get('service') ?? '';
    const nextLocation = searchParams.get('location') ?? '';
    setSearchTerm(nextService);
    setLocation(nextLocation || 'Current location');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const qService = searchParams.get('service') ?? '';
        const servicesParam = selectedCategory === 'all'
          ? undefined
          : selectedCategory.replaceAll('-', ' ');

        const response = await searchStores({
          q: qService.trim(),
          limit: 25,
          offset: 0,
          minRating,
          services: servicesParam,
          ...(userCoords ? {
            lat: userCoords.lat,
            lng: userCoords.lng,
            radiusKm: distance * 1.60934,
          } : {}),
        });

        if (!cancelled) {
          setStores((response?.items ?? []).map(normalizeStore));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load shops.');
          setStores([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [searchParams, userCoords, distance, minRating, selectedCategory]);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!mapHostRef.current) return;
      if (!mapsApiKey) {
        setMapStatus('Google Maps key is missing. Add it to www/public/config.js and rebuild the www container.');
        return;
      }

      setMapStatus('Loading map...');
      try {
        await loadGoogleMaps(mapsApiKey);
        if (disposed || mapRef.current) return;

        mapRef.current = new window.google.maps.Map(mapHostRef.current, {
          center: userCoords || DEFAULT_MAP_CENTER,
          zoom: userCoords ? 11 : 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setMapReady(true);
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
  }, [mapsApiKey, userCoords]);

  const filteredStores = useMemo(() => {
    let items = stores;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      items = items.filter(
        (s) => s.name.toLowerCase().includes(q)
          || s.services?.some((svc) => svc.toLowerCase().includes(q)),
      );
    }

    if (priceRange !== 'all') {
      items = items.filter((s) => s.priceRange === priceRange);
    }

    const withDistance = items.map((store) => {
      if (!userCoords || store.lat == null || store.lng == null) {
        return { ...store, distanceMiles: null };
      }
      return {
        ...store,
        distanceMiles: distanceMiles(userCoords.lat, userCoords.lng, store.lat, store.lng),
      };
    });

    const sorted = [...withDistance];
    switch (sortBy) {
      case 'rating':
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'reviews':
        sorted.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
        break;
      case 'closest':
        sorted.sort((a, b) => {
          const ad = a.distanceMiles ?? Number.POSITIVE_INFINITY;
          const bd = b.distanceMiles ?? Number.POSITIVE_INFINITY;
          return ad - bd;
        });
        break;
      case 'best':
      default:
        sorted.sort((a, b) => {
          const r = (b.rating ?? 0) - (a.rating ?? 0);
          if (r !== 0) return r;
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        });
        break;
    }

    return sorted;
  }, [stores, searchTerm, priceRange, sortBy, userCoords]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    mapMarkersRef.current.forEach((marker) => marker.setMap(null));
    mapMarkersRef.current = [];

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
      radiusCircleRef.current = null;
    }

    const bounds = new window.google.maps.LatLngBounds();
    let markerCount = 0;

    if (userCoords) {
      userMarkerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        position: userCoords,
        title: 'Your location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#4da3ff',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      radiusCircleRef.current = new window.google.maps.Circle({
        map: mapRef.current,
        center: userCoords,
        radius: distance * 1609.34,
        strokeColor: '#4da3ff',
        strokeOpacity: 0.65,
        strokeWeight: 1,
        fillColor: '#4da3ff',
        fillOpacity: 0.12,
      });
      bounds.extend(userCoords);
    }

    filteredStores.forEach((store) => {
      if (store.lat == null || store.lng == null) return;
      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: { lat: store.lat, lng: store.lng },
        title: store.name || 'Shop',
      });
      mapMarkersRef.current.push(marker);
      bounds.extend(marker.getPosition());
      markerCount += 1;
    });

    if (markerCount > 0 || userCoords) {
      mapRef.current.fitBounds(bounds);
      if (markerCount === 1 && !userCoords) {
        mapRef.current.setZoom(13);
      }
      if (markerCount === 0 && userCoords) {
        mapRef.current.setZoom(11);
      }
    }
  }, [mapReady, filteredStores, userCoords, distance]);

  const resultsCount = filteredStores.length;

  return (
    <>
      <section className="mb-4">
        <div className="wt-card">
          <form onSubmit={handleTopSearch} className="row g-3 align-items-stretch">
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuSearch className="wt-text-muted" size={18} />
                </span>
                <input
                  type="text"
                  className="form-control wt-input border-0"
                  placeholder="Search shops or services"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0">
                  <LuMapPin className="wt-text-muted" size={18} />
                </span>
                <input
                  type="text"
                  className="form-control wt-input border-0"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-md-2 d-grid">
              <button type="submit" className="btn btn-wt-primary">
                Search
              </button>
            </div>
            <div className="col-6 col-md-2 d-grid">
              <button
                type="button"
                className="btn btn-wt-outline"
                disabled={locating}
                onClick={handleUseMyLocation}
              >
                {locating ? 'Locating...' : 'Use My Location'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section>
        <div className="row g-4">
          <div className="col-12 col-lg-3">
            <aside className="wt-card" style={{ position: 'sticky', top: '5rem' }}>
              <div className="d-flex align-items-center gap-2 mb-4">
                <LuSlidersHorizontal className="wt-text-muted" size={18} />
                <h3 className="h6 mb-0 text-white">Filters</h3>
              </div>

              <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #3A3652' }}>
                <label className="d-block text-white mb-2 small">
                  Distance: {distance} miles
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-100"
                />
                <div className="d-flex justify-content-between mt-1 small wt-text-muted">
                  <span>1 mi</span>
                  <span>50 mi</span>
                </div>
              </div>

              <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #3A3652' }}>
                <label className="d-block text-white mb-2 small">Minimum Rating</label>
                <div className="d-flex flex-column gap-2">
                  {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                    <label key={rating} className="d-flex align-items-center gap-2 small wt-text-muted">
                      <input
                        type="radio"
                        name="rating"
                        className="form-check-input"
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                      />
                      <div className="d-flex align-items-center gap-1">
                        <LuStar size={16} style={{ color: '#6C63FF' }} />
                        <span>{rating}+</span>
                      </div>
                    </label>
                  ))}
                  <label className="d-flex align-items-center gap-2 small wt-text-muted">
                    <input
                      type="radio"
                      name="rating"
                      className="form-check-input"
                      checked={minRating === 0}
                      onChange={() => setMinRating(0)}
                    />
                    <span>All Ratings</span>
                  </label>
                </div>
              </div>

              <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #3A3652' }}>
                <label className="d-block text-white mb-2 small">Service Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="form-select wt-input"
                >
                  {CATEGORIES.map((cat) => (
                    <option
                      key={cat}
                      value={cat === 'All Services' ? 'all' : cat.toLowerCase().replace(' ', '-')}
                    >
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="d-block text-white mb-2 small">Price Range</label>
                <div className="d-flex flex-column gap-2 small wt-text-muted">
                  {[
                    { label: 'All Prices', value: 'all' },
                    { label: '$ - Budget', value: '$' },
                    { label: '$$ - Moderate', value: '$$' },
                    { label: '$$$ - Premium', value: '$$$' },
                  ].map((option) => (
                    <label key={option.value} className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        name="price"
                        className="form-check-input"
                        checked={priceRange === option.value}
                        onChange={() => setPriceRange(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="button" className="btn btn-wt-outline w-100 mt-1" onClick={handleResetFilters}>
                Reset Filters
              </button>
            </aside>
          </div>

          <div className="col-12 col-lg-9">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2">
              <div>
                <h2 className="mb-1">Auto Repair Shops</h2>
                <p className="wt-text-muted mb-0">
                  {resultsCount} shops found near {location || 'your area'}
                </p>
              </div>
              <select
                className="form-select wt-input"
                style={{ width: 'auto' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="best">Best Match</option>
                <option value="rating">Highest Rated</option>
                <option value="reviews">Most Reviews</option>
                <option value="closest">Closest</option>
              </select>
            </div>

            {loading && <p className="wt-text-muted small mb-2">Loading shops...</p>}
            {error && !loading && (
              <p className="small mb-2" style={{ color: '#FF8C42' }}>
                {error}
              </p>
            )}

            <div className="d-flex flex-column gap-3 mb-4">
              {filteredStores.map((shop) => (
                <ShopCard key={shop.id} {...shop} />
              ))}
              {!loading && !error && filteredStores.length === 0 && (
                <p className="wt-text-muted small mb-0">
                  No shops match your current filters.
                </p>
              )}
            </div>

            <div className="wt-card">
              <h3 className="h5 text-white mb-3">Map View</h3>
              <div style={{ position: 'relative' }}>
                <div ref={mapHostRef} className="rounded-4" style={{ height: '24rem', width: '100%' }} />
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
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
