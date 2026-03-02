import { apiFetchResponse } from './client.js';

function parseErrorPayload(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function fetchApiBlob(path) {
  const res = await apiFetchResponse(path, { method: 'GET' });

  if (!res.ok) {
    const payload = parseErrorPayload(await res.text());
    const err = new Error(
      typeof payload?.message === 'string' && payload.message.trim()
        ? payload.message
        : `API error: ${res.status} ${res.statusText}`
    );
    err.status = res.status;
    if (payload?.errors && typeof payload.errors === 'object') {
      err.errors = payload.errors;
    }
    throw err;
  }

  const blob = await res.blob();
  return {
    blob,
    contentType: res.headers.get('content-type') || blob.type || 'application/octet-stream',
  };
}
