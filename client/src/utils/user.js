export function getAnonUserId() {
  try {
    const key = 'anon_user_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'guest';
  }
}

export function getAuthHeaders(init = {}) {
  const headers = new Headers(init instanceof Headers ? init : init || {});
  const userId = getAnonUserId();
  headers.set('x-user-id', userId);
  return headers;
}


