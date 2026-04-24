import { apiFetch } from './client.js';

export function listReviews(storeId) {
  return apiFetch(`/stores/${storeId}/reviews`);
}

export function submitReview(storeId, payload) {
  const body = {
    rating: payload.rating,
    comment: payload.comment,
  };
  // Only attach linkage fields that exist for this visit so the endpoint can validate them selectively.
  if (payload.serviceId) body.serviceId = payload.serviceId;
  if (payload.receiptId) body.receiptId = payload.receiptId;
  if (payload.workOrderId) body.workOrderId = payload.workOrderId;

  return apiFetch(`/stores/${storeId}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
