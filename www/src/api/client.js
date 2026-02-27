import { logout, refreshSession } from '../auth/keycloak.js';

const BASE = '/api';

function toAbsoluteApiPath(path) {
  return path.startsWith('/') ? BASE + path : BASE + '/' + path;
}

function isAuthRequest(path) {
  return path.startsWith('/api/auth/');
}

async function parsePayload(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildApiError(response, payload) {
  const fallback = `API error: ${response.status} ${response.statusText}`;
  const message = typeof payload?.message === 'string' && payload.message.trim()
    ? payload.message
    : fallback;

  const error = new Error(message);
  error.status = response.status;
  if (payload && typeof payload === 'object') {
    error.payload = payload;
    if (payload.errors && typeof payload.errors === 'object') {
      error.errors = payload.errors;
    }
  }
  return error;
}

async function fetchWithSession(path, options = {}, allowRefresh = true) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
  });

  if (response.status !== 401 || !allowRefresh || isAuthRequest(path)) {
    return response;
  }

  try {
    await refreshSession();
  } catch {
    await logout();
    return response;
  }

  const retried = await fetch(path, {
    ...options,
    credentials: 'include',
  });

  if (retried.status === 401) {
    await logout();
  }

  return retried;
}

export async function apiFetchResponse(path, options = {}, allowRefresh = true) {
  const url = toAbsoluteApiPath(path);
  return fetchWithSession(url, options, allowRefresh);
}

/**
 * Centralized API client. Uses relative base URL /api, fetch with credentials,
 * throws on non-ok response, returns parsed JSON.
 * @param {string} path - Path after /api (e.g. "/stores/search?q=foo")
 * @param {RequestInit} [options] - Optional fetch options (merged with credentials)
 * @returns {Promise<any>} Parsed JSON body
 */
export async function apiFetch(path, options = {}) {
  const res = await apiFetchResponse(path, options, true);
  const payload = await parsePayload(res);

  if (!res.ok) {
    throw buildApiError(res, payload);
  }

  return payload;
}
