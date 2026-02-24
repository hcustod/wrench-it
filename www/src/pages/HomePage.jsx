import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuSearch, LuMapPin, LuBadgeCheck, LuDollarSign, LuShield } from 'react-icons/lu';
import { searchStores } from '../api/stores.js';
import ShopCard from '../components/shop/ShopCard.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [service, setService] = useState('');
  const [featuredShops, setFeaturedShops] = useState([]);

  function handleSearch(e) {
    if (e?.preventDefault) e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set('location', location.trim());
    if (service.trim()) params.set('service', service.trim());
    const query = params.toString();
    navigate(`/search${query ? `?${query}` : ''}`);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadFeatured() {
      try {
        const response = await searchStores();
        if (!cancelled) {
          const items = response?.items ?? [];
          setFeaturedShops(items.slice(0, 4));
        }
      } catch {
        // keep existing empty state; backend team can refine handling later
      }
    }
    loadFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="py-5 py-lg-6">
        <div className="container">
          <div className="text-center mb-4 mb-lg-5">
            <h1 className="display-5 fw-semibold mb-3">
              Find honest, local mechanics you can trust.
            </h1>
            <p className="wt-text-muted mx-auto mb-4" style={{ maxWidth: '40rem' }}>
              Compare prices, read verified reviews, and choose the right shop for your car.
            </p>
          </div>

          <div className="mx-auto" style={{ maxWidth: '52rem' }}>
            <div className="wt-card shadow-sm">
              <form
                onSubmit={handleSearch}
                className="row g-3 align-items-stretch flex-column flex-md-row"
              >
                <div className="col-12 col-md-4">
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-0">
                      <LuMapPin className="wt-text-muted" size={20} />
                    </span>
                    <input
                      type="text"
                      className="form-control wt-input border-0"
                      placeholder="Enter your location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-0">
                      <LuSearch className="wt-text-muted" size={20} />
                    </span>
                    <input
                      type="text"
                      className="form-control wt-input border-0"
                      placeholder="Service or shop name"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12 col-md-4 d-grid">
                  <button type="submit" className="btn btn-wt-primary h-100">
                    Search Nearby
                  </button>
                </div>
              </form>
            </div>

            <div className="d-flex justify-content-center gap-3 mt-3">
              <button
                type="button"
                className="btn btn-wt-outline"
                onClick={() => navigate('/search')}
              >
                Browse Shops
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="py-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <div className="text-center wt-card h-100">
                <div className="d-inline-flex align-items-center justify-content-center mb-3">
                  <div className="rounded-4 p-3" style={{ backgroundColor: '#2A2740' }}>
                    <LuBadgeCheck size={28} className="text-primary" />
                  </div>
                </div>
                <h3 className="h5 mb-2">Verified Reviews</h3>
                <p className="wt-text-muted mb-0">
                  All reviews are verified by certified mechanics for authenticity.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="text-center wt-card h-100">
                <div className="d-inline-flex align-items-center justify-content-center mb-3">
                  <div className="rounded-4 p-3" style={{ backgroundColor: '#2A2740' }}>
                    <LuDollarSign size={28} className="text-primary" />
                  </div>
                </div>
                <h3 className="h5 mb-2">Transparent Prices</h3>
                <p className="wt-text-muted mb-0">
                  Compare prices across shops before booking your service.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="text-center wt-card h-100">
                <div className="d-inline-flex align-items-center justify-content-center mb-3">
                  <div className="rounded-4 p-3" style={{ backgroundColor: '#2A2740' }}>
                    <LuShield size={28} className="text-primary" />
                  </div>
                </div>
                <h3 className="h5 mb-2">Trusted Mechanics</h3>
                <p className="wt-text-muted mb-0">
                  Find reliable shops with proven track records in your area.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Shops */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-4 mb-lg-5">
            <div
              className="mx-auto mb-3"
              style={{ width: '3rem', height: '0.25rem', backgroundColor: '#6C63FF', borderRadius: '999px' }}
            />
            <h2 className="h3 mb-2">Featured Shops</h2>
            <p className="wt-text-muted mb-0">Highly rated mechanics in your area.</p>
          </div>

          <div className="row g-4">
            {featuredShops.map((shop) => (
              <div key={shop.id} className="col-12 col-md-6 col-lg-3">
                <ShopCard {...shop} />
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <Link to="/search" className="btn btn-wt-outline">
              View All Shops
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

