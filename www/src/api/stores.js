import { apiFetch } from './client.js';

export function searchStores(params = {}) {
  const search = new URLSearchParams();
  if (params.q != null && params.q !== '') search.set('q', params.q);
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (params.sort) search.set('sort', params.sort);
  if (params.direction) search.set('direction', params.direction);
  if (typeof params.lat === 'number') search.set('lat', String(params.lat));
  if (typeof params.lng === 'number') search.set('lng', String(params.lng));
  if (typeof params.radiusKm === 'number') search.set('radiusKm', String(params.radiusKm));
  if (typeof params.minRating === 'number' && params.minRating > 0) {
    search.set('minRating', String(params.minRating));
  }
  if (params.services) search.set('services', params.services);
  if (params.city) search.set('city', params.city);
  if (params.state) search.set('state', params.state);
  if (params.priceRange) search.set('priceRange', params.priceRange);

  const qs = search.toString();
  return apiFetch(`/stores/search${qs ? `?${qs}` : ''}`);
}

export function getStore(id) {
  return apiFetch(`/stores/${id}`);
}

export function listStoreServices(storeId) {
  return apiFetch(`/stores/${storeId}/services`);
}

export function compareStores(ids, options = {}) {
  const search = new URLSearchParams();
  ids.forEach((id) => search.append('ids', id));
  if (options.sort) search.set('sort', options.sort);
  if (options.direction) search.set('direction', options.direction);
  const qs = search.toString();
  return apiFetch(`/stores/compare${qs ? `?${qs}` : ''}`);
}

export function listCompareServices() {
  return apiFetch('/stores/services');
}

export function compareStoresByService(service) {
  const search = new URLSearchParams();
  search.set('service', service);
  return apiFetch(`/stores/compare-by-service?${search.toString()}`);
}
