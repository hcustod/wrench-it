import { apiFetch } from './client.js';

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
