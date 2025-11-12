const ADMIN_TOKEN_KEY = 'admin_token';

export function getStoredAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function storeAdminToken(token) {
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearAdminToken() {
  storeAdminToken('');
}

export function getAdminAuthHeaders(init = {}) {
  const headers = new Headers(init instanceof Headers ? init : init || {});
  const token = getStoredAdminToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export function hasAdminToken() {
  return Boolean(getStoredAdminToken());
}


