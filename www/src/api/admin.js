import { apiFetch } from './client.js';
import { fetchApiBlob } from './files.js';

export function getAdminDashboard() {
  return apiFetch('/admin/dashboard');
}

export function decidePendingShop(id, payload) {
  return apiFetch(`/admin/pending-shops/${id}/decision`, {
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

export function getAdminUsers(limit = 50) {
  return apiFetch(`/admin/users?limit=${encodeURIComponent(String(limit))}`);
}

export function getAdminReview(id) {
  return apiFetch(`/admin/reviews/${id}`);
}

export function decideAdminReview(id, payload) {
  return apiFetch(`/admin/reviews/${id}/decision`, {
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

export async function getAdminReviewFile(id) {
  return fetchApiBlob(`/admin/reviews/${id}/file`);
}
