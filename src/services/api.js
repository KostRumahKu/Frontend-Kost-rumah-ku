// Pembungkus fetch untuk endpoint yang memakai Bearer token
import { API_BASE_URL } from '../utils/config.js';
import { clearSession } from '../utils/session.js';
import { buildHeaders } from './auth-service.js';

/**
 * @returns {Promise<any>} isi "data" dari respons sukses
 * @throws {Error} dengan pesan yang siap ditampilkan ke pengguna
 */
export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
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

  // Token kedaluwarsa atau tidak valid: hapus sesi lalu kembali ke login
  if (res.status === 401 && auth) {
    clearSession();
    // Redirect ke halaman login umum; setiap role punya halaman login sendiri
    // tapi untuk simplisitas 401 selalu ke /auth/login (penyewa)
    // atau /auth/admin-login kalau path saat ini di bawah /admin
    const isAdminPage = window.location.pathname.startsWith('/admin') ||
                        window.location.pathname.startsWith('/owner');
    window.location.replace(isAdminPage ? '/auth/admin-login' : '/auth/login');
    throw new Error('Sesi berakhir. Silakan masuk lagi.');
  }

  if (!res.ok || hasil?.status !== 'sukses') {
    throw new Error(hasil?.pesan ?? hasil?.message ?? 'Terjadi kesalahan. Silakan coba lagi.');
  }

  return hasil.data;
}