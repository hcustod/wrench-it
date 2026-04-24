import { apiFetch } from './client.js';

export function createWorkOrder(payload) {
  return apiFetch('/work-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Keep optional vehicle fields present so the backend gets a consistent request shape.
      storeId: payload.storeId,
      serviceId: payload.serviceId,
      scheduledFor: payload.scheduledFor,
      vehicleYear: payload.vehicleYear ?? null,
      vehicleMake: payload.vehicleMake ?? '',
      vehicleModel: payload.vehicleModel ?? '',
      customerNotes: payload.customerNotes ?? '',
    }),
  });
}

export function listMyWorkOrders() {
  return apiFetch('/work-orders/me');
}

export function listReviewableWorkOrders(storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  return apiFetch(`/work-orders/reviewable${query}`);
}
