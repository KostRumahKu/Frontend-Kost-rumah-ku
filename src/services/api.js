import { API_BASE_URL } from '../utils/config.js';
import { clearSession } from '../utils/session.js';
import { buildHeaders } from './auth-service.js';

const CACHE_PREFIX = 'kostrumahku-cache:';
const CACHE_TTL    = 10_000;

export function clearApiCache() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch { /* abaikan */ }
}

function cacheGet(path) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_PREFIX + path); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(path, data) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + path, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* abaikan */ }
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const isGet = method === 'GET';
  if (isGet) {
    const cached = cacheGet(path);
    if (cached !== null) return cached;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL()}${path}`, {
      method,
      headers: buildHeaders(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }

  const hasil = await res.json().catch(() => null);

  if (res.status === 401 && auth) {
    clearApiCache();
    clearSession();
    const isAdminPage = window.location.pathname.startsWith('/admin') ||
                        window.location.pathname.startsWith('/owner');
    window.location.replace(isAdminPage ? '/auth/admin-login' : '/auth/login');
    throw new Error('Sesi berakhir. Silakan masuk lagi.');
  }

  if (!res.ok || hasil?.status !== 'sukses') {
    throw new Error(hasil?.pesan ?? hasil?.message ?? 'Terjadi kesalahan. Silakan coba lagi.');
  }

  if (isGet) { cacheSet(path, hasil.data); } else { clearApiCache(); }
  return hasil.data;
}
