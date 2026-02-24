import { Link } from 'react-router-dom';

export default function ShopCard({
  id,
  name,
  rating,
  reviewCount,
  location,
  priceRange,
  services = [],
}) {
  const topServices = services.slice(0, 3);

  return (
    <div className="wt-card h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h3 className="h5 mb-1">{name}</h3>
          <p className="wt-text-muted small mb-0">{location}</p>
        </div>
        <div className="text-end">
          <div className="fw-semibold">
            {typeof rating === 'number' ? rating.toFixed(1) : rating}/5
          </div>
          <div className="wt-text-muted small">{reviewCount} reviews</div>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between mt-2 mb-3">
        <span className="wt-text-muted small">Price range: {priceRange}</span>
        <span className="wt-badge-verified">Verified</span>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {topServices.map((service) => (
          <span key={service} className="wt-chip-service">
            {service}
          </span>
        ))}
      </div>

      <div className="mt-auto">
        <Link to={`/shop/${id}`} className="btn btn-sm btn-wt-primary w-100">
          View Shop
        </Link>
      </div>
    </div>
  );
}

