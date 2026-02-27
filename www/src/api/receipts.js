import { apiFetch } from './client.js';

export function createReceipt(payload) {
  if (payload?.file instanceof File) {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.storeId) formData.append('storeId', String(payload.storeId));
    if (payload.currency) formData.append('currency', String(payload.currency));
    if (payload.totalCents != null) formData.append('totalCents', String(payload.totalCents));

    return apiFetch('/receipts', {
      method: 'POST',
      body: formData,
    });
  }

  return apiFetch('/receipts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
