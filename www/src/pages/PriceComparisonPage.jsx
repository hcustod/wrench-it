import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuBadgeCheck,
  LuClock3,
  LuMapPin,
  LuPin,
  LuPinOff,
  LuStar,
} from 'react-icons/lu';
import {
  compareStores,
  compareStoresByService,
  listCompareServices,
} from '../api/stores.js';

const MAX_PINNED_ITEMS = 3;

function formatPrice(price) {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    return 'Call';
  }

  if (Number.isInteger(price)) {
    return `$${price}`;
  }

  return `$${price.toFixed(2)}`;
}

function formatDuration(minutes) {
  if (typeof minutes !== 'number' || Number.isNaN(minutes) || minutes <= 0) {
    return 'Ask shop';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatRating(rating) {
  if (typeof rating !== 'number' || Number.isNaN(rating) || rating <= 0) {
    return '—';
  }
  return `${rating.toFixed(1)} / 5`;
}

function formatReviewCount(reviewCount) {
  if (typeof reviewCount !== 'number' || reviewCount <= 0) {
    return 'No reviews yet';
  }
  return `${reviewCount} review${reviewCount === 1 ? '' : 's'}`;
}

function normalizeWebsite(website) {
  if (!website) return '';
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export default function PriceComparisonPage() {
  const [serviceOptions, setServiceOptions] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [comparisonRows, setComparisonRows] = useState([]);
  const [pinnedStoreIds, setPinnedStoreIds] = useState([]);
  const [pinnedStoreDetails, setPinnedStoreDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailsError, setDetailsError] = useState('');

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
      setPinnedStoreIds([]);
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
          durationMinutes: typeof store.durationMinutes === 'number' ? store.durationMinutes : null,
          hasVerifiedMechanic: Boolean(store.hasVerifiedMechanic),
        }));

        setComparisonRows(rows);
        setPinnedStoreDetails({});
        setPinnedStoreIds((current) => {
          const validCurrent = current
            .filter((id) => rows.some((row) => row.id === id))
            .slice(0, MAX_PINNED_ITEMS);

          if (validCurrent.length > 0) {
            return validCurrent;
          }

          return rows.slice(0, Math.min(2, rows.length)).map((row) => row.id);
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load comparison.');
        setComparisonRows([]);
        setPinnedStoreIds([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadComparison();

    return () => {
      cancelled = true;
    };
  }, [selectedService]);

  useEffect(() => {
    if (pinnedStoreIds.length === 0) {
      setPinnedStoreDetails({});
      setDetailsError('');
      return;
    }

    let cancelled = false;

    async function loadPinnedDetails() {
      setDetailsLoading(true);
      setDetailsError('');

      try {
        const response = await compareStores(pinnedStoreIds, {
          sort: 'NAME',
          direction: 'ASC',
        });
        if (cancelled) return;

        const detailsById = {};
        for (const store of response?.stores ?? []) {
          detailsById[store.id] = {
            address: store.address ?? '',
            phone: store.phone ?? '',
            website: store.website ?? '',
            servicesText: store.servicesText ?? '',
            rating: typeof store?.reviews?.averageRating === 'number'
              ? store.reviews.averageRating
              : (typeof store.rating === 'number' ? store.rating : 0),
            reviewCount: typeof store?.reviews?.reviewCount === 'number'
              ? store.reviews.reviewCount
              : (typeof store.ratingCount === 'number' ? store.ratingCount : 0),
          };
        }

        setPinnedStoreDetails(detailsById);
      } catch (err) {
        if (cancelled) return;
        setDetailsError(err instanceof Error ? err.message : 'Failed to load pinned store details.');
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    }

    loadPinnedDetails();

    return () => {
      cancelled = true;
    };
  }, [pinnedStoreIds]);

  const sortedRows = useMemo(() => {
    const rows = [...comparisonRows];
    rows.sort((a, b) => {
      const aPrice = a.price == null ? Number.POSITIVE_INFINITY : a.price;
      const bPrice = b.price == null ? Number.POSITIVE_INFINITY : b.price;

      if (aPrice !== bPrice) {
        return aPrice - bPrice;
      }

      return b.rating - a.rating;
    });
    return rows;
  }, [comparisonRows]);

  const rowById = useMemo(
    () => Object.fromEntries(sortedRows.map((row) => [row.id, row])),
    [sortedRows],
  );

  const pinnedItems = useMemo(
    () => pinnedStoreIds
      .map((id) => {
        const base = rowById[id];
        if (!base) return null;

        const detail = pinnedStoreDetails[id] ?? {};
        return {
          ...base,
          address: detail.address || base.location || 'Location unavailable',
          phone: detail.phone || '',
          website: normalizeWebsite(detail.website),
          servicesText: detail.servicesText || selectedService,
          rating: typeof detail.rating === 'number' && detail.rating > 0 ? detail.rating : base.rating,
          reviewCount: typeof detail.reviewCount === 'number' && detail.reviewCount >= 0
            ? detail.reviewCount
            : base.reviewCount,
        };
      })
      .filter(Boolean),
    [pinnedStoreDetails, pinnedStoreIds, rowById, selectedService],
  );

  const cheapestPinnedId = useMemo(() => {
    const priced = pinnedItems.filter((item) => item.price != null);
    if (priced.length === 0) return '';
    return [...priced].sort((a, b) => a.price - b.price)[0].id;
  }, [pinnedItems]);

  const topRatedPinnedId = useMemo(() => {
    const rated = pinnedItems.filter((item) => item.rating > 0);
    if (rated.length === 0) return '';
    return [...rated].sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.reviewCount - a.reviewCount;
    })[0].id;
  }, [pinnedItems]);

  const compareMetrics = [
    {
      key: 'address',
      label: 'Address',
      render: (item) => item.address,
    },
    {
      key: 'price',
      label: 'Price',
      render: (item) => <span className="wt-compare-emphasis">{formatPrice(item.price)}</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (item) => (
        <span className="d-inline-flex align-items-center gap-2">
          <LuStar size={14} className="wt-compare-star" />
          <span>{formatRating(item.rating)}</span>
        </span>
      ),
    },
    {
      key: 'reviews',
      label: 'Reviews',
      render: (item) => formatReviewCount(item.reviewCount),
    },
    {
      key: 'duration',
      label: 'Estimated Time',
      render: (item) => (
        <span className="d-inline-flex align-items-center gap-2">
          <LuClock3 size={14} />
          <span>{formatDuration(item.durationMinutes)}</span>
        </span>
      ),
    },
    {
      key: 'verified',
      label: 'Verified',
      render: (item) => item.hasVerifiedMechanic ? (
        <span className="wt-compare-verified">
          <LuBadgeCheck size={15} />
          Verified
        </span>
      ) : '—',
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (item) => item.phone || '—',
    },
    {
      key: 'website',
      label: 'Website',
      render: (item) => item.website ? (
        <a
          href={item.website}
          target="_blank"
          rel="noreferrer"
          className="wt-compare-inline-link"
        >
          Visit site
        </a>
      ) : '—',
    },
    {
      key: 'profile',
      label: 'Profile',
      render: (item) => (
        <Link to={`/shop/${item.id}`} className="wt-compare-inline-link">
          View shop
        </Link>
      ),
    },
  ];

  function togglePinned(storeId) {
    setPinnedStoreIds((current) => {
      if (current.includes(storeId)) {
        return current.filter((id) => id !== storeId);
      }

      if (current.length >= MAX_PINNED_ITEMS) {
        return current;
      }

      return [...current, storeId];
    });
  }

  return (
    <div className="wt-compare-page">
      <section className="wt-compare-hero">
        <div>
          <span className="wt-compare-kicker">Service Compare</span>
          <h1 className="mb-2">Pin offers and compare them side by side.</h1>
          <p className="wt-text-muted mb-0">
            Price, address, reviews, timing, and contact details stay in one place.
          </p>
        </div>

        <div className="wt-card wt-compare-filter-card">
          <label htmlFor="compare-service" className="wt-compare-label">
            Service
          </label>
          <select
            id="compare-service"
            value={selectedService}
            onChange={(event) => setSelectedService(event.target.value)}
            className="form-select wt-input"
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

          <div className="wt-compare-summary-row">
            <span>{loading ? 'Loading offers...' : `${sortedRows.length} offers found`}</span>
            <span>{`${pinnedItems.length}/${MAX_PINNED_ITEMS} pinned`}</span>
          </div>

          {error && <p className="wt-home-inline-error mb-0">{error}</p>}
        </div>
      </section>

      <section className="wt-compare-layout">
        <div className="wt-card wt-compare-matrix-card">
          <div className="wt-compare-section-header">
            <div>
              <h2 className="h4 mb-1">Pinned Comparison</h2>
              <p className="wt-text-muted mb-0">Keep up to three shops in view at once.</p>
            </div>
            {pinnedItems.length > 0 && (
              <div className="wt-compare-chip-row">
                {pinnedItems.map((item) => (
                  <button
                    key={`chip-${item.id}`}
                    type="button"
                    className="wt-compare-chip"
                    onClick={() => togglePinned(item.id)}
                  >
                    <span>{item.name}</span>
                    <LuPinOff size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {pinnedItems.length > 0 ? (
            <div className="wt-compare-table-shell">
              <table className="wt-compare-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {pinnedItems.map((item) => (
                      <th key={`head-${item.id}`}>
                        <div className="wt-compare-column-head">
                          <div className="wt-compare-column-badges">
                            {item.id === cheapestPinnedId && (
                              <span className="wt-compare-badge wt-compare-badge-price">Best Price</span>
                            )}
                            {item.id === topRatedPinnedId && (
                              <span className="wt-compare-badge wt-compare-badge-rating">Top Rated</span>
                            )}
                          </div>
                          <strong>{item.name}</strong>
                          <span>{item.location}</span>
                          <button
                            type="button"
                            className="wt-compare-unpin"
                            onClick={() => togglePinned(item.id)}
                          >
                            <LuPinOff size={14} />
                            Remove
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareMetrics.map((metric) => (
                    <tr key={metric.key}>
                      <td className="wt-compare-metric">{metric.label}</td>
                      {pinnedItems.map((item) => (
                        <td key={`${metric.key}-${item.id}`}>
                          {metric.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="wt-compare-empty">
              <strong>No offers pinned yet.</strong>
              <p className="wt-text-muted mb-0">
                Pick a service card below and pin the shops you want beside each other.
              </p>
            </div>
          )}

          {(detailsLoading || detailsError) && (
            <div className="wt-compare-note-row">
              {detailsLoading && <span className="wt-text-muted">Refreshing pinned store details...</span>}
              {detailsError && <span className="wt-home-inline-error">{detailsError}</span>}
            </div>
          )}
        </div>

        <div className="wt-card wt-compare-results-card">
          <div className="wt-compare-section-header">
            <div>
              <h2 className="h4 mb-1">Available Offers</h2>
              <p className="wt-text-muted mb-0">
                Cheapest results surface first. Pin the ones worth weighing against each other.
              </p>
            </div>
            <span className="wt-compare-results-count">
              {loading ? 'Loading...' : `${sortedRows.length} results`}
            </span>
          </div>

          <div className="wt-compare-results-grid">
            {sortedRows.map((row, index) => {
              const isPinned = pinnedStoreIds.includes(row.id);
              const isPinDisabled = !isPinned && pinnedStoreIds.length >= MAX_PINNED_ITEMS;

              return (
                <article
                  key={row.id}
                  className={isPinned ? 'wt-compare-result-card pinned' : 'wt-compare-result-card'}
                >
                  <div className="wt-compare-result-top">
                    <div>
                      <div className="wt-compare-column-badges">
                        {index === 0 && (
                          <span className="wt-compare-badge wt-compare-badge-price">Best Price</span>
                        )}
                        {row.hasVerifiedMechanic && (
                          <span className="wt-compare-badge wt-compare-badge-verified">Verified</span>
                        )}
                      </div>
                      <h3>{row.name}</h3>
                    </div>

                    <button
                      type="button"
                      className={isPinned ? 'wt-compare-pin-button active' : 'wt-compare-pin-button'}
                      onClick={() => togglePinned(row.id)}
                      disabled={isPinDisabled}
                    >
                      {isPinned ? <LuPinOff size={16} /> : <LuPin size={16} />}
                      <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                    </button>
                  </div>

                  <div className="wt-compare-result-meta">
                    <span className="d-inline-flex align-items-center gap-2">
                      <LuMapPin size={14} />
                      <span>{row.location}</span>
                    </span>
                    <span className="d-inline-flex align-items-center gap-2">
                      <LuClock3 size={14} />
                      <span>{formatDuration(row.durationMinutes)}</span>
                    </span>
                  </div>

                  <div className="wt-compare-result-stats">
                    <div>
                      <span className="wt-compare-stat-label">Price</span>
                      <strong>{formatPrice(row.price)}</strong>
                    </div>
                    <div>
                      <span className="wt-compare-stat-label">Rating</span>
                      <strong>{formatRating(row.rating)}</strong>
                    </div>
                    <div>
                      <span className="wt-compare-stat-label">Reviews</span>
                      <strong>{formatReviewCount(row.reviewCount)}</strong>
                    </div>
                  </div>

                  <div className="wt-compare-result-actions">
                    <Link to={`/shop/${row.id}`} className="btn btn-wt-primary">
                      View Shop
                    </Link>
                    {isPinDisabled && (
                      <span className="wt-text-muted small">Remove one pinned offer to add another.</span>
                    )}
                  </div>
                </article>
              );
            })}

            {!loading && sortedRows.length === 0 && (
              <div className="wt-compare-empty">
                <strong>No comparison data found.</strong>
                <p className="wt-text-muted mb-0">
                  Try another service or add more store service pricing data.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
