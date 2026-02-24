import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuMapPin, LuSearch, LuMap, LuSlidersHorizontal, LuStar } from 'react-icons/lu';
import { mockShops } from '../data/mockData.js';
import ShopCard from '../components/shop/ShopCard.jsx';

function getStores() {
  // TODO: later replace with real API call
  return mockShops;
}

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

  function handleTopSearch(e) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (location.trim()) next.set('location', location.trim());
    if (searchTerm.trim()) next.set('service', searchTerm.trim());
    setSearchParams(next);
    // filtering is still mock-based; params kept for future API use
  }

  function handleResetFilters() {
    setDistance(10);
    setMinRating(0);
    setSelectedCategory('all');
    setPriceRange('all');
    setSortBy('best');
  }

  const stores = useMemo(() => {
    let items = getStores();

    // simple text search on name/services
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.services?.some((svc) => svc.toLowerCase().includes(q)),
      );
    }

    // min rating
    if (minRating > 0) {
      items = items.filter((s) => (typeof s.rating === 'number' ? s.rating : 0) >= minRating);
    }

    // price
    if (priceRange !== 'all') {
      items = items.filter((s) => s.priceRange === priceRange);
    }

    // category
    if (selectedCategory !== 'all') {
      const catToken = selectedCategory.replace('-', ' ').toLowerCase();
      items = items.filter((s) =>
        s.services?.some((svc) => svc.toLowerCase().includes(catToken)),
      );
    }

    const sorted = [...items];
    switch (sortBy) {
      case 'rating':
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'reviews':
        sorted.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
        break;
      case 'closest':
        // no real distance yet; keep as-is for now
        break;
      case 'best':
      default:
        // simple composite: rating then reviews
        sorted.sort((a, b) => {
          const r = (b.rating ?? 0) - (a.rating ?? 0);
          if (r !== 0) return r;
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        });
        break;
    }

    return sorted;
  }, [searchTerm, minRating, priceRange, selectedCategory, sortBy]);

  const resultsCount = stores.length;

  return (
    <>
      {/* Search Header */}
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
            <div className="col-12 col-md-4 d-grid">
              <button type="submit" className="btn btn-wt-primary">
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      <section>
        <div className="row g-4">
          {/* Filters Sidebar */}
          <div className="col-12 col-lg-3">
            <aside
              className="wt-card"
              style={{ position: 'sticky', top: '5rem' }}
            >
              <div className="d-flex align-items-center gap-2 mb-4">
                <LuSlidersHorizontal className="wt-text-muted" size={18} />
                <h3 className="h6 mb-0 text-white">Filters</h3>
              </div>

              {/* Distance Slider */}
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

              {/* Rating Filter */}
              <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #3A3652' }}>
                <label className="d-block text-white mb-2 small">Minimum Rating</label>
                <div className="d-flex flex-column gap-2">
                  {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                    <label
                      key={rating}
                      className="d-flex align-items-center gap-2 small wt-text-muted"
                    >
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

              {/* Service Category */}
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

              {/* Price Range */}
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

              <button
                type="button"
                className="btn btn-wt-outline w-100 mt-1"
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            </aside>
          </div>

          {/* Results Section */}
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

            {/* Shop Cards */}
            <div className="d-flex flex-column gap-3 mb-4">
              {stores.map((shop) => (
                <ShopCard key={shop.id} {...shop} />
              ))}
            </div>

            {/* Map Section */}
            <div className="wt-card">
              <h3 className="h5 text-white mb-3">Map View</h3>
              <div
                className="rounded-4 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: '#2A2740', height: '24rem' }}
              >
                <div className="text-center">
                  <LuMapPin className="wt-text-muted mb-2" size={40} />
                  <p className="wt-text-muted mb-0">
                    Interactive map showing shop locations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}


