// Centralized configuration for API and Socket endpoints
// Reads from Vite env vars at build time

const apiBase = (import.meta?.env?.VITE_API_BASE || '').replace(/\/$/, '');
const socketUrl = (import.meta?.env?.VITE_SOCKET_URL || '').trim();

export function getApiBase() {
  return apiBase || '';
}

export function withApiBase(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBase();
  if (!base) return path;
  if (!path.startsWith('/')) return `${base}/${path}`;
  return `${base}${path}`;
}

export function getSocketUrl() {
  // Empty string means same-origin; Socket.IO client handles that when passing undefined
  return socketUrl || '';
}


