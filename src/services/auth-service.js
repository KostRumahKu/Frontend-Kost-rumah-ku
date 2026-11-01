// Pemanggilan API autentikasi
import { API_BASE_URL, INTERNAL_KEY } from '../utils/config.js';
import { getToken } from '../utils/session.js';

/**
 * Header dasar yang disertakan di setiap request ke backend.
 * x-internal-key  : identifikasi aplikasi frontend ke backend.
 * Authorization   : JWT token sesi aktif (opsional, hanya kalau sudah login).
 */
function buildHeaders(withAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
    'x-internal-key': INTERNAL_KEY(),
  };
  if (withAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Login penyewa.
 * Request : POST /api/auth/penyewa/login  { email, "kata-sandi" }
 * Response: { status: "sukses", pesan, data: { token, peran, nama } }
 */
export async function loginPenyewa(email, kataSandi) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL()}/api/auth/penyewa/login`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email, 'kata-sandi': kataSandi }),
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }

  const hasil = await res.json().catch(() => null);

  if (!res.ok || hasil?.status !== 'sukses') {
    throw new Error(hasil?.pesan ?? hasil?.message ?? 'Login gagal. Silakan coba lagi.');
  }

  return hasil.data; // { token, peran, nama }
}

/**
 * Login owner.
 * Request : POST /api/auth/owner/login  { email, "kata-sandi" }
 */
export async function loginOwner(email, kataSandi) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL()}/api/auth/owner/login`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email, 'kata-sandi': kataSandi }),
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }

  const hasil = await res.json().catch(() => null);

  if (!res.ok || hasil?.status !== 'sukses') {
    throw new Error(hasil?.pesan ?? hasil?.message ?? 'Login gagal. Silakan coba lagi.');
  }

  return hasil.data; // { token, peran, nama }
}

/**
 * Login admin.
 * Request : POST /api/auth/admin/login  { email, "kata-sandi" }
 */
export async function loginAdmin(email, kataSandi) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL()}/api/auth/admin/login`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email, 'kata-sandi': kataSandi }),
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }

  const hasil = await res.json().catch(() => null);

  if (!res.ok || hasil?.status !== 'sukses') {
    throw new Error(hasil?.pesan ?? hasil?.message ?? 'Login gagal. Silakan coba lagi.');
  }

  return hasil.data; // { token, peran, nama }
}

// buildHeaders diekspor supaya bisa dipakai service lain (dashboard, pembayaran, dll.)
export { buildHeaders };
