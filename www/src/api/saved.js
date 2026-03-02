import { apiFetch, apiFetchResponse } from './client.js';

/**
 * GET /api/me/saved
 * @returns {Promise<Array>} list of saved shops
 */
export function listSavedShops() {
  return apiFetch('/me/saved');
}

/**
 * GET /api/me/saved without auth refresh side-effects.
 * Returns null when no authenticated session exists.
 * @returns {Promise<Array|null>}
 */
export async function listSavedShopsIfAuthenticated() {
  const response = await apiFetchResponse('/me/saved', { method: 'GET' }, false);
  if (response.status === 401 || response.status === 403) {
    return null;
  }

  const text = await response.text();
  const payload = text ? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })() : null;

  if (!response.ok) {
    const fallback = `API error: ${response.status} ${response.statusText}`;
    const err = new Error(
      typeof payload?.message === 'string' && payload.message.trim()
        ? payload.message
        : fallback
    );
    err.status = response.status;
    if (payload?.errors && typeof payload.errors === 'object') {
      err.errors = payload.errors;
    }
    throw err;
  }

  return Array.isArray(payload) ? payload : [];
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
