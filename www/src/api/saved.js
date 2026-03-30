import { apiFetch, apiFetchResponse } from './client.js';

export function listSavedShops() {
  return apiFetch('/me/saved');
}

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

export function saveShop(storeId) {
  return apiFetch(`/stores/${storeId}/save`, { method: 'POST' });
}

export function unsaveShop(storeId) {
  return apiFetch(`/stores/${storeId}/save`, { method: 'DELETE' });
}
