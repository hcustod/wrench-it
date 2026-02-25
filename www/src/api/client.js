const BASE = '/api';

/**
 * Centralized API client. Uses relative base URL /api, fetch with credentials,
 * throws on non-ok response, returns parsed JSON.
 * @param {string} path - Path after /api (e.g. "/stores/search?q=foo")
 * @param {RequestInit} [options] - Optional fetch options (merged with credentials)
 * @returns {Promise<any>} Parsed JSON body
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith('/') ? BASE + path : BASE + '/' + path;
  const res = await fetch(url, { ...options, credentials: 'include' });
  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`);
    // surface HTTP status code for callers that need to branch on auth errors
    error.status = res.status;
    throw error;
  }
  return res.json();
}
