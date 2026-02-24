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
 * @param {{ rating: number, comment: string }} payload
 * @returns {Promise<object>} created/updated review
 */
export function submitReview(storeId, payload) {
  return apiFetch(`/stores/${storeId}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rating: payload.rating,
      comment: payload.comment,
    }),
  });
}

