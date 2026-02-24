import { useState } from 'react';
import { Link } from 'react-router-dom';
import { searchStores } from '../api/stores.js';

export default function Home() {
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await searchStores(query);
      setStores(data.items ?? []);
    } catch (err) {
      setError(err.message || 'Search failed');
      setStores([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4">
      <h1 className="mb-3">WrenchIT</h1>
      <form onSubmit={handleSearch} className="d-flex gap-2 mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search stores (e.g. mechanic, brakes)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <div className="alert alert-danger">{error}</div>}
      <ul className="list-group">
        {stores.map((store) => {
          const id = store.id ?? store.placeId ?? store.name;
          return (
            <li key={id} className="list-group-item">
              <Link to={`/stores/${id}`}>{store.name ?? 'Store'}</Link>
            </li>
          );
        })}
      </ul>
      {!loading && stores.length === 0 && !error && (
        <p className="text-muted mt-2">No results yet. Enter a query and search.</p>
      )}
    </div>
  );
}
