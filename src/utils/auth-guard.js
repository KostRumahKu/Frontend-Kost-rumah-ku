// Penjaga halaman: cek peran dari sessionStorage.
// Token JWT diverifikasi backend via cookie — tidak perlu cek token di sini.
import { getSession, clearSession } from './session.js';
import { ROLE_HOME } from './config.js';
import { clearApiCache } from '../services/api.js';

/**
 * Pakai di awal script halaman yang dilindungi.
 * @returns sesi { peran, nama } jika boleh masuk, atau null jika dialihkan
 */
export function requireRole(role) {
  const sesi = getSession();

  if (!sesi?.token) {
    const loginUrl = role === 'admin' || role === 'owner'
      ? '/auth/admin-login'
      : '/auth/login';
    window.location.replace(loginUrl);
    return null;
  }

  const peran = String(sesi.peran).toLowerCase();
  if (peran !== role) {
    window.location.replace(ROLE_HOME[peran] ?? '/auth/login');
    return null;
  }

  return sesi;
}

export function logout() {
  const sesi = getSession();
  const peran = String(sesi?.peran ?? '').toLowerCase();
  clearApiCache();
  clearSession();
  // Hapus session JWT di proxy server
  fetch('/session/clear', { method: 'POST' }).catch(() => {});
  const loginUrl = peran === 'admin' || peran === 'owner'
    ? '/auth/admin-login'
    : '/auth/login';
  window.location.assign(loginUrl);
}
