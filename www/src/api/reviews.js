import { apiFetch } from './client.js';

/**
 * GET /api/stores/{storeId}/reviews
 * @param {string} storeId
 * @returns {Promise<Array>} list of reviews
 */
export function listReviews(storeId) {
  return apiFetch(`/stores/${storeId}/reviews`);
}

/**
 * POST /api/stores/{storeId}/reviews
 * @param {string} storeId
 * @param {{ rating: number, comment: string, serviceId?: string, receiptId?: string }} payload
 * @returns {Promise<object>} created/updated review
 */
export function submitReview(storeId, payload) {
  const body = {
    rating: payload.rating,
    comment: payload.comment,
  };
  if (payload.serviceId) body.serviceId = payload.serviceId;
  if (payload.receiptId) body.receiptId = payload.receiptId;

  return apiFetch(`/stores/${storeId}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
