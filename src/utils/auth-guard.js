// Penjaga halaman: wajib login dan sesuai peran
import { getSession, clearSession } from './session.js';
import { ROLE_HOME } from './config.js';

/**
 * Pakai di awal script halaman yang dilindungi.
 * @returns sesi jika boleh masuk, atau null jika pengguna dialihkan
 */
export function requireRole(role) {
  const sesi = getSession();

  if (!sesi?.token) {
    // Arahkan ke halaman login sesuai role yang diminta
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
  clearSession();
  const loginUrl = peran === 'admin' || peran === 'owner'
    ? '/auth/admin-login'
    : '/auth/login';
  window.location.assign(loginUrl);
}