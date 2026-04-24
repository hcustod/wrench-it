import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LuBadgeCheck,
  LuChevronLeft,
  LuChevronRight,
  LuMapPin,
  LuWrench,
} from 'react-icons/lu';
import { searchStores } from '../api/stores.js';
import { loadGoogleMaps, resolveMapsApiKey } from '../lib/googleMaps.js';

const DEFAULT_MAP_CENTER = { lat: 43.6532, lng: -79.3832 };
const MechanicBackdrop = lazy(() => import('../components/home/MechanicBackdrop.jsx'));

function buildLocationLabel(store) {
  return [
    store?.address,
    store?.city,
    store?.state,
  ].filter(Boolean).join(', ') || 'Location unavailable';
}

function buildGeocodeAddress(store) {
  return [
    store?.address,
    store?.city,
    store?.state,
    store?.postalCode,
    store?.country,
  ].filter(Boolean).join(', ');
}

function normalizeStore(store) {
  return {
    ...store,
    reviewCount: store?.reviewCount ?? store?.ratingCount ?? 0,
    location: store?.location ?? buildLocationLabel(store),
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

function resolveCardsPerView() {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth >= 1400) return 4;
  if (window.innerWidth >= 1100) return 3;
  if (window.innerWidth >= 768) return 2;
  return 1;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildInfoWindowMarkup(shop) {
  const rating = typeof shop.rating === 'number' ? `${shop.rating.toFixed(1)} / 5` : 'No rating yet';

  return `
    <div style="color:#183c3e; min-width:220px; font-family:Inter, Arial, sans-serif;">
      <div style="font-size:15px; font-weight:700; margin-bottom:6px;">${escapeHtml(shop.name)}</div>
      <div style="font-size:13px; color:#5d7e7e; margin-bottom:8px;">${escapeHtml(shop.location)}</div>
      <div style="font-size:13px; color:#5d7e7e; margin-bottom:12px;">${escapeHtml(rating)}</div>
      <a
        href="/shop/${encodeURIComponent(shop.id)}"
        style="display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:999px; background:#1d9288; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600;"
      >
        Open shop profile
      </a>
    </div>
  `;
}

export default function HomePage() {
  const [spotlightShops, setSpotlightShops] = useState([]);
  const [featuredShops, setFeaturedShops] = useState([]);
  const [totalShops, setTotalShops] = useState(0);
  const [error, setError] = useState('');
  const [mapStatus, setMapStatus] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [resolvedStoreCoords, setResolvedStoreCoords] = useState({});
  const [activePage, setActivePage] = useState(0);
  const [activeShopId, setActiveShopId] = useState('');
  const [cardsPerView, setCardsPerView] = useState(() => resolveCardsPerView());

  const mapHostRef = useRef(null);
  const mapRef = useRef(null);
  const mapMarkersRef = useRef(new Map());
  const infoWindowRef = useRef(null);
  const mapsApiKey = useMemo(() => resolveMapsApiKey(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadSpotlightShops() {
      setError('');
      try {
        const response = await searchStores({
          limit: 12,
          sort: 'RATING',
          direction: 'DESC',
          minRating: 4,
        });
        if (cancelled) return;

        const items = (response?.items ?? []).map(normalizeStore);
        setSpotlightShops(items);
        setFeaturedShops(items.slice(0, 8));
        setTotalShops(typeof response?.total === 'number' ? response.total : items.length);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load shops.');
        setSpotlightShops([]);
        setFeaturedShops([]);
        setTotalShops(0);
      }
    }

    loadSpotlightShops();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      setCardsPerView(resolveCardsPerView());
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!mapHostRef.current) return;
      if (!mapsApiKey) {
        setMapStatus('Add a Google Maps API key in `www/public/config.js` to render the live store map.');
        return;
      }

      setMapStatus('Loading live shop map...');
      try {
        await loadGoogleMaps(mapsApiKey);
        if (disposed || mapRef.current) return;

        mapRef.current = new window.google.maps.Map(mapHostRef.current, {
          center: DEFAULT_MAP_CENTER,
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'cooperative',
          clickableIcons: false,
        });
        infoWindowRef.current = new window.google.maps.InfoWindow();
        setMapReady(true);
        setMapStatus('');
      } catch {
        if (!disposed) {
          setMapStatus('Google Maps could not load. Check the API key and localhost referrer settings.');
        }
      }
    }

    initMap();
    return () => {
      disposed = true;
    };
  }, [mapsApiKey]);

  const displayedMapShops = useMemo(
    () => spotlightShops.map((shop) => {
      const fallbackCoords = resolvedStoreCoords[shop.id];
      return {
        ...shop,
        lat: shop.lat ?? fallbackCoords?.lat ?? null,
        lng: shop.lng ?? fallbackCoords?.lng ?? null,
      };
    }),
    [spotlightShops, resolvedStoreCoords],
  );

  const featuredCarouselShops = useMemo(
    () => featuredShops.map((shop) => {
      const fallbackCoords = resolvedStoreCoords[shop.id];
      return {
        ...shop,
        lat: shop.lat ?? fallbackCoords?.lat ?? null,
        lng: shop.lng ?? fallbackCoords?.lng ?? null,
      };
    }),
    [featuredShops, resolvedStoreCoords],
  );

  useEffect(() => {
    if (!mapReady || !window.google?.maps) return;

    const missingCoords = spotlightShops.filter((shop) => {
      if (!shop?.id) return false;
      if (shop.lat != null && shop.lng != null) return false;
      return Boolean(buildGeocodeAddress(shop));
    });

    if (missingCoords.length === 0) return undefined;

    let cancelled = false;
    const geocoder = new window.google.maps.Geocoder();

    async function resolveMissingCoords() {
      for (const shop of missingCoords) {
        const address = buildGeocodeAddress(shop);

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
          current[shop.id]
            ? current
            : { ...current, [shop.id]: coords }
        ));
      }
    }

    void resolveMissingCoords();

    return () => {
      cancelled = true;
    };
  }, [mapReady, spotlightShops]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    mapMarkersRef.current.forEach((marker) => marker.setMap(null));
    mapMarkersRef.current = new Map();

    const bounds = new window.google.maps.LatLngBounds();
    let markerCount = 0;

    displayedMapShops.forEach((shop, index) => {
      if (shop.lat == null || shop.lng == null) return;

      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: { lat: shop.lat, lng: shop.lng },
        title: shop.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: index === 0 ? '#1d9288' : '#7ccdc7',
          fillOpacity: 1,
          strokeColor: '#f9fffe',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        setActiveShopId(shop.id);
        infoWindowRef.current?.setContent(buildInfoWindowMarkup(shop));
        infoWindowRef.current?.open({
          anchor: marker,
          map: mapRef.current,
        });
      });

      mapMarkersRef.current.set(shop.id, marker);
      bounds.extend(marker.getPosition());
      markerCount += 1;
    });

    if (markerCount === 0) {
      mapRef.current.setCenter(DEFAULT_MAP_CENTER);
      mapRef.current.setZoom(9);
      return;
    }

    if (markerCount === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(11);
      return;
    }

    mapRef.current.fitBounds(bounds, 80);
    window.google.maps.event.addListenerOnce(mapRef.current, 'bounds_changed', () => {
      if (mapRef.current?.getZoom() > 11) {
        mapRef.current.setZoom(11);
      }
    });
  }, [displayedMapShops, mapReady]);

  const carouselPages = useMemo(() => {
    if (featuredCarouselShops.length === 0) return [];

    const pages = [];
    for (let index = 0; index < featuredCarouselShops.length; index += cardsPerView) {
      pages.push(featuredCarouselShops.slice(index, index + cardsPerView));
    }
    return pages;
  }, [featuredCarouselShops, cardsPerView]);

  function focusShopOnMap(shop) {
    if (!shop?.id || !mapReady || !mapRef.current) return;

    const marker = mapMarkersRef.current.get(shop.id);
    const position = marker?.getPosition?.();

    if (!marker || !position) return;

    setActiveShopId(shop.id);
    mapRef.current.panTo(position);
    if ((mapRef.current.getZoom?.() ?? 0) < 13) {
      mapRef.current.setZoom(13);
    }

    infoWindowRef.current?.setContent(buildInfoWindowMarkup(shop));
    infoWindowRef.current?.open({
      anchor: marker,
      map: mapRef.current,
    });

    mapHostRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }

  const resolvedPinCount = displayedMapShops.filter((shop) => shop.lat != null && shop.lng != null).length;
  const activeCarouselPage = Math.min(activePage, Math.max(carouselPages.length - 1, 0));
  const selectedShopId = featuredCarouselShops.some((shop) => shop.id === activeShopId)
    ? activeShopId
    : (featuredCarouselShops[0]?.id ?? '');
  const mapSummaryLabel = totalShops > 0 ? `${totalShops}+ local shops indexed` : 'Live local shop data';
  const mapNotice = mapStatus || (
    mapReady && spotlightShops.length > 0 && resolvedPinCount === 0
      ? 'Pin data is still resolving for the featured shops.'
      : ''
  );

  return (
    <>
      <section className="wt-home-hero">
        <Suspense fallback={null}>
          <MechanicBackdrop />
        </Suspense>
        <div className="container">
          <div className="row align-items-end g-4">
            <div className="col-12 col-xl-8">
              <h1 className="wt-home-title">Find nearby mechanics you can trust.</h1>
            </div>
            <div className="col-12 col-xl-4">
              <div className="wt-home-signal-grid">
                <div className="wt-home-signal-card">
                  <div className="wt-home-signal-top">
                    <span className="wt-home-signal-icon">
                      <LuMapPin size={17} />
                    </span>
                    <span className="wt-home-signal-label">Coverage</span>
                  </div>
                  <strong className="wt-home-signal-value">{mapSummaryLabel}</strong>
                  <p className="wt-home-signal-copy mb-0">
                    GTA storefronts and mobile mechanics ready to browse.
                  </p>
                </div>
                <div className="wt-home-signal-card">
                  <div className="wt-home-signal-top">
                    <span className="wt-home-signal-icon">
                      <LuBadgeCheck size={17} />
                    </span>
                    <span className="wt-home-signal-label">Reviews</span>
                  </div>
                  <strong className="wt-home-signal-value">Receipt-backed ratings</strong>
                  <p className="wt-home-signal-copy mb-0">
                    Real customer visits stay visible when you vet a shop.
                  </p>
                </div>
                <div className="wt-home-signal-card">
                  <div className="wt-home-signal-top">
                    <span className="wt-home-signal-icon">
                      <LuWrench size={17} />
                    </span>
                    <span className="wt-home-signal-label">Compare</span>
                  </div>
                  <strong className="wt-home-signal-value">Services + pricing</strong>
                  <p className="wt-home-signal-copy mb-0">
                    Shortlist offers and line them up before you commit.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="wt-home-map-card">
            <div className="wt-home-map-toolbar">
              <div>
                <span className="wt-home-section-label">Live Shop Map</span>
                <h2 className="wt-home-section-title mb-0">Explore nearby shops</h2>
              </div>
            </div>

            <div className="wt-home-map-shell">
              <div ref={mapHostRef} className="wt-home-map">
                {!mapsApiKey && (
                  <div className="wt-home-map-fallback">
                    <div>
                      <strong>Google Maps key required</strong>
                      <p className="mb-0">
                        Add the frontend Google Maps key to render live shop pins here.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {mapNotice && (
                <div className="wt-home-map-status">
                  {mapNotice}
                </div>
              )}
            </div>

            <div className="wt-home-map-carousel-header">
              <strong className="wt-home-map-carousel-title">Featured Shops</strong>
              <div className="wt-home-carousel-controls">
                <button
                  type="button"
                  className="wt-home-carousel-button"
                  onClick={() => setActivePage(Math.max(activeCarouselPage - 1, 0))}
                  disabled={activeCarouselPage === 0}
                  aria-label="Previous featured shops"
                >
                  <LuChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="wt-home-carousel-button"
                  onClick={() => setActivePage(Math.min(activeCarouselPage + 1, carouselPages.length - 1))}
                  disabled={activeCarouselPage >= carouselPages.length - 1}
                  aria-label="Next featured shops"
                >
                  <LuChevronRight size={18} />
                </button>
              </div>
            </div>

            {carouselPages.length > 0 ? (
              <div className="wt-home-carousel">
                <div className="wt-home-carousel-shell">
                  <div
                    className="wt-home-carousel-track"
                    style={{ transform: `translateX(-${activeCarouselPage * 100}%)` }}
                  >
                    {carouselPages.map((page, pageIndex) => (
                      <div
                        key={`page-${pageIndex}`}
                        className="wt-home-carousel-page"
                        style={{ '--wt-featured-columns': cardsPerView }}
                      >
                        {page.map((shop) => (
                          <button
                            key={shop.id}
                            type="button"
                            className={shop.id === selectedShopId ? 'wt-home-map-spot active' : 'wt-home-map-spot'}
                            onClick={() => focusShopOnMap(shop)}
                          >
                            <div className="wt-home-map-spot-top">
                              <strong>{shop.name}</strong>
                              <span className="wt-home-map-spot-rating">
                                {typeof shop.rating === 'number' ? `${shop.rating.toFixed(1)}/5` : 'New'}
                              </span>
                            </div>
                            <span className="wt-home-map-spot-location">{shop.location}</span>
                            <div className="wt-home-map-spot-meta">
                              <span>
                                {shop.reviewCount > 0 ? `${shop.reviewCount} reviews` : 'New listing'}
                              </span>
                              <span>{`Price range: ${shop.priceRange}`}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {carouselPages.length > 1 && (
                  <div className="wt-home-carousel-dots">
                    {carouselPages.map((_, pageIndex) => (
                      <button
                        key={`dot-${pageIndex}`}
                        type="button"
                        className={pageIndex === activeCarouselPage ? 'wt-home-carousel-dot active' : 'wt-home-carousel-dot'}
                        onClick={() => setActivePage(pageIndex)}
                        aria-label={`Go to featured shop page ${pageIndex + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="wt-card mt-3">
                <strong>No featured shops available yet</strong>
                <p className="wt-text-muted mb-0 mt-2">
                  Shops will appear here as soon as the catalog has results.
                </p>
              </div>
            )}

            {error && <p className="wt-home-inline-error mb-0 mt-3">{error}</p>}
          </div>
        </div>
      </section>
    </>
  );
}
