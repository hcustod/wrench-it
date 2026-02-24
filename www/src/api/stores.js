import { apiFetch } from './client.js';

/**
 * GET /api/stores/search?q=
 * @param {string} [query] - Search query
 * @returns {Promise<{ items: Array, limit: number, offset: number, total: number }>}
 */
export function searchStores(query) {
  const q = encodeURIComponent(query ?? '');
  return apiFetch(`/stores/search?q=${q}`);
}

/**
 * GET /api/stores/{id}
 * @param {string} id - Store UUID
 * @returns {Promise<object>} Store detail
 */
export function getStore(id) {
  return apiFetch(`/stores/${id}`);
}
