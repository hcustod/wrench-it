import { apiFetch } from './client.js';

/**
 * GET /api/stores/search
 * @param {{
 *  q?: string,
 *  limit?: number,
 *  offset?: number,
 *  sort?: string,
 *  direction?: string,
 *  lat?: number,
 *  lng?: number,
 *  radiusKm?: number,
 *  minRating?: number,
 *  services?: string
 * }} [params]
 * @returns {Promise<{ items: Array, limit: number, offset: number, total: number }>}
 */
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

  const qs = search.toString();
  return apiFetch(`/stores/search${qs ? `?${qs}` : ''}`);
}

/**
 * GET /api/stores/{id}
 * @param {string} id - Store UUID
 * @returns {Promise<object>} Store detail
 */
export function getStore(id) {
  return apiFetch(`/stores/${id}`);
}

/**
 * GET /api/stores/compare
 * @param {string[]} ids - Store UUIDs
 * @param {{ sort?: string, direction?: string }} [options]
 * @returns {Promise<{ stores: Array }>}
 */
export function compareStores(ids, options = {}) {
  const search = new URLSearchParams();
  ids.forEach((id) => search.append('ids', id));
  if (options.sort) search.set('sort', options.sort);
  if (options.direction) search.set('direction', options.direction);
  const qs = search.toString();
  return apiFetch(`/stores/compare${qs ? `?${qs}` : ''}`);
}
