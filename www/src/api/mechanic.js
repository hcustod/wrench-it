import { apiFetch, apiFetchResponse } from './client.js';

export function getMechanicDashboard() {
  return apiFetch('/mechanic/dashboard');
}

export function getMechanicReceipt(id) {
  return apiFetch(`/mechanic/receipts/${id}`);
}

export function decideMechanicReceipt(id, payload) {
  return apiFetch(`/mechanic/receipts/${id}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      result: payload.result,
      notes: payload.notes ?? '',
    }),
  });
}

export async function getMechanicReceiptFile(id) {
  const res = await apiFetchResponse(`/mechanic/receipts/${id}/file`, {
    method: 'GET',
  });

  if (!res.ok) {
    let payload = null;
    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
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
