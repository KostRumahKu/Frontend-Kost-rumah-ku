import { API_BASE_URL } from '../utils/config.js';
import { getToken } from '../utils/session.js';

export function buildHeaders(withAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
    // x-internal-key diinjek oleh proxy Express — tidak dikirim dari browser
  };
  if (withAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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

export async function loginOwner(email, kataSandi) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL()}/api/auth/pemilik/login`, {
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
  return hasil.data;
}

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
  return hasil.data;
}

export async function lupaSandi(email) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL()}/api/auth/lupa-password`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }
  const hasil = await res.json().catch(() => null);
  if (!res.ok || hasil?.status !== 'sukses') {
    throw new Error(hasil?.pesan ?? hasil?.message ?? 'Gagal mengirim OTP. Silakan coba lagi.');
  }
}

export async function konfirmasiLupaSandi(email, otp, passwordBaru) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL()}/api/auth/lupa-password/konfirmasi`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email, otp, passwordBaru }),
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }
  const hasil = await res.json().catch(() => null);
  if (!res.ok || hasil?.status !== 'sukses') {
    throw new Error(hasil?.pesan ?? hasil?.message ?? 'Gagal mereset sandi. Silakan coba lagi.');
  }
}
