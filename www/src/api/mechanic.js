import { apiFetch } from './client.js';
import { fetchApiBlob } from './files.js';

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
  return fetchApiBlob(`/mechanic/receipts/${id}/file`);
}
