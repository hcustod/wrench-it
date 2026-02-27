import { apiFetch } from './client.js';

export function getMyDashboard() {
  return apiFetch('/me/dashboard');
}
