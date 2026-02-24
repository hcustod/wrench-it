import { apiFetch } from './client.js';

/**
 * GET /api/me/saved
 * @returns {Promise<Array>} list of saved shops
 */
export function listSavedShops() {
  return apiFetch('/me/saved');
}

/**
 * POST /api/stores/{storeId}/save
 * @param {string} storeId
 * @returns {Promise<void>}
 */
export function saveShop(storeId) {
  return apiFetch(`/stores/${storeId}/save`, { method: 'POST' });
}

/**
 * DELETE /api/stores/{storeId}/save
 * @param {string} storeId
 * @returns {Promise<void>}
 */
export function unsaveShop(storeId) {
  return apiFetch(`/stores/${storeId}/save`, { method: 'DELETE' });
}

