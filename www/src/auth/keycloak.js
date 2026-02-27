function extractErrorMessage(payload, fallback) {
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload?.error_description === 'string' && payload.error_description.trim()) {
    return payload.error_description;
  }
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  return fallback;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toError(response, payload, fallbackMessage) {
  const error = new Error(extractErrorMessage(payload, fallbackMessage));
  error.status = response.status;
  if (payload && typeof payload === 'object') {
    error.payload = payload;
    if (payload.errors && typeof payload.errors === 'object') {
      error.errors = payload.errors;
    }
  }
  return error;
}

async function postAuth(path, body, fallbackError) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: body == null ? undefined : { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body == null ? undefined : JSON.stringify(body),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw toError(response, payload, fallbackError);
  }

  if (!payload || typeof payload !== 'object') {
    return { authenticated: true };
  }

  return payload;
}

export function routeForRole(role) {
  const normalized = typeof role === 'string' ? role.trim().toUpperCase() : '';
  if (normalized === 'ADMIN') return '/admin';
  if (normalized === 'MECHANIC') return '/mechanic-dashboard';
  if (normalized === 'SHOP_OWNER') return '/shop-dashboard';
  return '/dashboard';
}

export async function getCurrentUser() {
  const response = await fetch('/api/me', {
    method: 'GET',
    credentials: 'include',
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw toError(response, payload, 'Unable to load session user.');
  }
  return payload;
}

export async function beginLogin(options = {}) {
  await postAuth(
    'login',
    {
      email: options.email,
      password: options.password,
    },
    'Unable to sign in.'
  );

  const me = await getCurrentUser();
  return { returnTo: routeForRole(me?.role) };
}

export async function beginRegistration(options = {}) {
  await postAuth(
    'register',
    {
      fullName: options.fullName,
      email: options.email,
      password: options.password,
      role: options.role,
      phone: options.phone,
      certificationNumber: options.certificationNumber,
      yearsExperience: options.yearsExperience,
      shopName: options.shopName,
      businessLicense: options.businessLicense,
    },
    'Unable to register account.'
  );

  const me = await getCurrentUser();
  return { returnTo: routeForRole(me?.role) };
}

export async function refreshSession() {
  return postAuth('refresh', null, 'Session refresh failed.');
}

export async function logout() {
  try {
    await postAuth('logout', null, 'Logout failed.');
  } catch {
    // Ignore logout failures on the client. Session may already be cleared.
  }
}
