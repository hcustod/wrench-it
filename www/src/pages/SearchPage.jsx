import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuMapPin, LuSearch, LuSlidersHorizontal, LuStar } from 'react-icons/lu';
import { searchStores } from '../api/stores.js';
import ShopCard from '../components/shop/ShopCard.jsx';
import { loadGoogleMaps, resolveMapsApiKey } from '../lib/googleMaps.js';

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

const DEFAULT_MAP_CENTER = { lat: 43.6532, lng: -79.3832 };

function resolveSearchSort(sortBy, hasCoords) {
  switch (sortBy) {
    case 'reviews':
      return { sort: 'REVIEW_COUNT', direction: 'DESC' };
    case 'name':
      return { sort: 'NAME', direction: 'ASC' };
    case 'closest':
      return hasCoords
        ? { sort: 'DISTANCE', direction: 'ASC' }
        : { sort: 'RATING', direction: 'DESC' };
    case 'rating':
    case 'best':
    default:
      return { sort: 'RATING', direction: 'DESC' };
  }
}

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
    priceRange: store?.priceRange ?? 'N/A',
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

function extractCanadianPostalCode(value) {
  const match = String(value ?? '').match(/[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d/i);
  return match ? match[0].toUpperCase().replace(/\s+/, ' ') : '';
}

function buildLocationQueries(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];

  const postalCode = extractCanadianPostalCode(raw);
  const withoutPostal = postalCode
    ? raw.replace(new RegExp(postalCode.replace(' ', '[ -]?'), 'i'), '').replace(/[,\s]+$/, '').trim()
    : raw;

  return Array.from(new Set([
    raw,
    `${raw}, Canada`,
    `${raw}, Ontario, Canada`,
    `${raw}, Toronto, ON, Canada`,
    withoutPostal && postalCode ? `${withoutPostal}, Toronto, ON ${postalCode}, Canada` : '',
    withoutPostal && postalCode ? `${withoutPostal}, ON ${postalCode}, Canada` : '',
    postalCode ? `${postalCode}, Canada` : '',
  ].filter(Boolean)));
}

async function resolvePlaceTextSearch(query) {
  if (!window.google?.maps?.places?.PlacesService) return null;

  const host = document.createElement('div');
  const service = new window.google.maps.places.PlacesService(host);
  const queries = Array.from(new Set([
    query,
    `${query}, Toronto`,
    `${query}, Ontario`,
    `${query}, Canada`,
  ].filter(Boolean)));

  for (const candidate of queries) {
    const coords = await new Promise((resolve) => {
      service.textSearch(
        {
          query: candidate,
          region: 'ca',
          location: new window.google.maps.LatLng(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng),
          radius: 100000,
        },
        (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK
            && Array.isArray(results)
            && results[0]?.geometry?.location) {
            const point = results[0].geometry.location;
            resolve({ lat: point.lat(), lng: point.lng() });
            return;
          }
          resolve(null);
        },
      );
    });

    if (coords) return coords;
  }

  return null;
}

async function resolveAddressGeocode(query) {
  const geocoder = new window.google.maps.Geocoder();
  const queries = buildLocationQueries(query);

  for (const candidate of queries) {
    const coords = await new Promise((resolve) => {
      geocoder.geocode(
        {
          address: candidate,
          region: 'ca',
        },
        (results, status) => {
          if (status === 'OK' && Array.isArray(results) && results[0]?.geometry?.location) {
            const point = results[0].geometry.location;
            resolve({ lat: point.lat(), lng: point.lng() });
            return;
          }
          resolve(null);
        },
      );
    });

    if (coords) return coords;
  }

  return null;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLocation = searchParams.get('location') ?? '';
  const initialService = searchParams.get('service') ?? '';

  const [searchTerm, setSearchTerm] = useState(initialService);
  const [location, setLocation] = useState(initialLocation);

  const [distance, setDistance] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [hasWebsite, setHasWebsite] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState('best');

  const [stores, setStores] = useState([]);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [userCoords, setUserCoords] = useState(null);
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationLookup, setLocationLookup] = useState({ loading: false, query: '', error: '' });
  const [locating, setLocating] = useState(false);

  const [mapStatus, setMapStatus] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [resolvedStoreCoords, setResolvedStoreCoords] = useState({});
  const mapHostRef = useRef(null);
  const mapRef = useRef(null);
  const mapMarkersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);

  const mapsApiKey = useMemo(() => resolveMapsApiKey(), []);
  const activeCoords = userCoords || locationCoords;

  function handleTopSearch(e) {
    e.preventDefault();
    const trimmedLocation = location.trim();
    if (trimmedLocation.toLowerCase() !== 'current location') {
      setUserCoords(null);
      setLocationCoords(null);
    }
    const next = new URLSearchParams();
    if (trimmedLocation) next.set('location', trimmedLocation);
    if (searchTerm.trim()) next.set('service', searchTerm.trim());
    setSearchParams(next);
  }

  function handleResetFilters() {
    setDistance(10);
    setMinRating(0);
    setSelectedCategory('all');
    setPriceRange('all');
    setHasWebsite(false);
    setHasPhone(false);
    setOpenNow(false);
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
      setLocationCoords(null);
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
    setLocation(nextLocation || (userCoords ? 'Current location' : ''));
  }, [searchParams, userCoords]);

  useEffect(() => {
    if (!activeCoords && sortBy === 'closest') {
      setSortBy('best');
    }
  }, [sortBy, activeCoords]);

  useEffect(() => {
    const qLocation = (searchParams.get('location') ?? '').trim();

    if (!qLocation || qLocation.toLowerCase() === 'current location' || userCoords) {
      setLocationLookup({ loading: false, query: qLocation, error: '' });
      return undefined;
    }

    let cancelled = false;

    async function resolveLocation() {
      setLocationLookup({ loading: true, query: qLocation, error: '' });
      setLocationCoords(null);

      if (!mapsApiKey) {
        setLocationLookup({
          loading: false,
          query: qLocation,
          error: 'Add a Google Maps key to search by address.',
        });
        return;
      }

      try {
        await loadGoogleMaps(mapsApiKey);
        if (cancelled) return;

        const coords = await resolvePlaceTextSearch(qLocation) || await resolveAddressGeocode(qLocation);

        if (cancelled) return;

        if (!coords) {
          setLocationLookup({
            loading: false,
            query: qLocation,
            error: `Could not find "${qLocation}". Try adding the city, province, or postal code.`,
          });
          return;
        }

        setLocationCoords(coords);
        setLocationLookup({ loading: false, query: qLocation, error: '' });
      } catch {
        if (!cancelled) {
          setLocationLookup({
            loading: false,
            query: qLocation,
            error: 'Could not load Google Maps geocoding. Check the Maps key and referrer restrictions.',
          });
        }
      }
    }

    void resolveLocation();
    return () => {
      cancelled = true;
    };
  }, [searchParams, userCoords, mapsApiKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const qService = searchParams.get('service') ?? '';
        const qLocation = (searchParams.get('location') ?? '').trim();
        const needsAddressCoords = qLocation
          && qLocation.toLowerCase() !== 'current location'
          && !userCoords;

        if (needsAddressCoords && !locationCoords) {
          setStores([]);
          setResultsTotal(0);
          return;
        }

        const searchCoords = userCoords || locationCoords;
        const servicesParam = selectedCategory === 'all'
          ? undefined
          : selectedCategory.replaceAll('-', ' ');
        const qParam = qService.trim();
        const sortRequest = resolveSearchSort(sortBy, Boolean(searchCoords));

        const response = await searchStores({
          q: qParam,
          limit: 25,
          offset: 0,
          sort: sortRequest.sort,
          direction: sortRequest.direction,
          minRating,
          services: servicesParam,
          ...(priceRange !== 'all' ? { priceRange } : {}),
          ...(hasWebsite ? { hasWebsite: true } : {}),
          ...(hasPhone ? { hasPhone: true } : {}),
          ...(openNow ? { openNow: true } : {}),
          ...(searchCoords ? {
            lat: searchCoords.lat,
            lng: searchCoords.lng,
            radiusKm: distance * 1.60934,
          } : {}),
        });

        if (!cancelled) {
          setStores((response?.items ?? []).map(normalizeStore));
          setResultsTotal(
            typeof response?.total === 'number'
              ? response.total
              : Array.isArray(response?.items)
                ? response.items.length
                : 0,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load shops.');
          setStores([]);
          setResultsTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [searchParams, userCoords, locationCoords, locationLookup.error, distance, minRating, selectedCategory, priceRange, hasWebsite, hasPhone, openNow, sortBy]);

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
        if (disposed) return;
        if (mapRef.current) {
          setMapReady(true);
          setMapStatus('');
          return;
        }

        mapRef.current = new window.google.maps.Map(mapHostRef.current, {
          center: activeCoords || DEFAULT_MAP_CENTER,
          zoom: activeCoords ? 11 : 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setMapReady(true);
        setMapStatus('');
      } catch {
        if (!disposed) {
          setMapStatus('Could not load Google Maps API. Check key, billing, and referrer restrictions.');
        }
      }
    }

    initMap();
    return () => {
      disposed = true;
    };
  }, [mapsApiKey, activeCoords]);

  const displayedStores = useMemo(
    () => stores.map((store) => {
      const fallbackCoords = resolvedStoreCoords[store.id];
      const lat = store.lat ?? fallbackCoords?.lat ?? null;
      const lng = store.lng ?? fallbackCoords?.lng ?? null;

      if (!activeCoords || lat == null || lng == null) {
        return { ...store, lat, lng, distanceMiles: activeCoords && lat != null && lng != null
          ? distanceMiles(activeCoords.lat, activeCoords.lng, lat, lng)
          : null };
      }
      return {
        ...store,
        lat,
        lng,
        distanceMiles: distanceMiles(activeCoords.lat, activeCoords.lng, lat, lng),
      };
    }),
    [stores, activeCoords, resolvedStoreCoords],
  );

  useEffect(() => {
    if (!mapReady || !window.google?.maps) return;

    const missingCoords = displayedStores.filter((store) => {
      if (!store?.id) return false;
      if (store.lat != null && store.lng != null) return false;

      const address = [
        store.address,
        store.city,
        store.state,
        store.postalCode,
        store.country,
      ].filter(Boolean).join(', ');
      return Boolean(address);
    });

    if (missingCoords.length === 0) {
      return undefined;
    }

    let cancelled = false;
    const geocoder = new window.google.maps.Geocoder();

    async function resolveMissingCoords() {
      for (const store of missingCoords) {
        const address = [
          store.address,
          store.city,
          store.state,
          store.postalCode,
          store.country,
        ].filter(Boolean).join(', ');

        const coords = await new Promise((resolve) => {
          geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && Array.isArray(results) && results[0]?.geometry?.location) {
              const point = results[0].geometry.location;
              resolve({ lat: point.lat(), lng: point.lng() });
              return;
            }
            resolve(null);
          });
        });

        if (cancelled || !coords) {
          if (cancelled) return;
          continue;
        }

        setResolvedStoreCoords((current) => (
          current[store.id]
            ? current
            : { ...current, [store.id]: coords }
        ));
      }
    }

    void resolveMissingCoords();

    return () => {
      cancelled = true;
    };
  }, [displayedStores, mapReady]);

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

    if (activeCoords) {
      userMarkerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        position: activeCoords,
        title: userCoords ? 'Your location' : locationLookup.query || 'Search location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#149488',
          fillOpacity: 1,
          strokeColor: '#ecfffb',
          strokeWeight: 2,
        },
      });

      radiusCircleRef.current = new window.google.maps.Circle({
        map: mapRef.current,
        center: activeCoords,
        radius: distance * 1609.34,
        strokeColor: '#149488',
        strokeOpacity: 0.65,
        strokeWeight: 1,
        fillColor: '#149488',
        fillOpacity: 0.12,
      });
      bounds.extend(activeCoords);
    }

    displayedStores.forEach((store) => {
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

    // Fit to whichever markers are available so the map still feels useful for both broad and local searches.
    if (markerCount > 0 || activeCoords) {
      mapRef.current.fitBounds(bounds);
      if (markerCount === 1 && !activeCoords) {
        mapRef.current.setZoom(13);
      }
      if (markerCount === 0 && activeCoords) {
        mapRef.current.setZoom(11);
      }
    }
  }, [mapReady, displayedStores, activeCoords, userCoords, locationLookup.query, distance]);

  const resultsCount = displayedStores.length;

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

              <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--wt-border-strong)' }}>
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

              <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--wt-border-strong)' }}>
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
                        <LuStar size={16} style={{ color: 'var(--wt-warning)' }} />
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

              <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--wt-border-strong)' }}>
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

              <div className="mb-4">
                <label className="d-block text-white mb-2 small">Availability &amp; Contact</label>
                <div className="d-flex flex-column gap-2 small wt-text-muted">
                  <label className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={hasWebsite}
                      onChange={(e) => setHasWebsite(e.target.checked)}
                    />
                    <span>Has website</span>
                  </label>
                  <label className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={hasPhone}
                      onChange={(e) => setHasPhone(e.target.checked)}
                    />
                    <span>Has phone number</span>
                  </label>
                  <label className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={openNow}
                      onChange={(e) => setOpenNow(e.target.checked)}
                    />
                    <span>Open now</span>
                  </label>
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
                  {resultsCount} of {resultsTotal} shops found near {location || 'your area'}
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
                <option value="name">Name A-Z</option>
                <option value="closest" disabled={!activeCoords}>Closest</option>
              </select>
            </div>

            {loading && <p className="wt-text-muted small mb-2">Loading shops...</p>}
            {locationLookup.loading && !loading && (
              <p className="wt-text-muted small mb-2">Finding that location...</p>
            )}
            {locationLookup.error && !loading && (
              <p className="small mb-2" style={{ color: 'var(--wt-accent-soft)' }}>
                {locationLookup.error}
              </p>
            )}
            {error && !loading && (
              <p className="small mb-2" style={{ color: 'var(--wt-accent-soft)' }}>
                {error}
              </p>
            )}

            <div className="wt-card mb-4">
              <h3 className="h5 text-white mb-3">Map View</h3>
              <div style={{ position: 'relative' }}>
                <div ref={mapHostRef} className="rounded-4" style={{ height: '24rem', width: '100%' }} />
                {mapStatus && (
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'var(--wt-bg-overlay)',
                    }}
                  >
                    <p className="wt-text-muted mb-0 px-3 text-center">{mapStatus}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="d-flex flex-column gap-3 mb-4">
              {displayedStores.map((shop) => (
                <ShopCard key={shop.id} {...shop} />
              ))}
              {!loading && !error && displayedStores.length === 0 && (
                <p className="wt-text-muted small mb-0">
                  No shops match your current filters.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
