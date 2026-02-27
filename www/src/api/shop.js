import { apiFetch } from './client.js';

export function getMyShopProfile() {
  return apiFetch('/shop/me');
}

export function updateMyShopProfile(payload) {
  return apiFetch('/shop/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function getMyShopServices() {
  return apiFetch('/shop/me/services');
}

export function createMyShopService(payload) {
  return apiFetch('/shop/me/services', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function updateMyShopService(serviceId, payload) {
  return apiFetch(`/shop/me/services/${serviceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function deleteMyShopService(serviceId) {
  return apiFetch(`/shop/me/services/${serviceId}`, {
    method: 'DELETE',
  });
}

export function getMyShopDashboard() {
  return apiFetch('/shop/me/dashboard');
}
