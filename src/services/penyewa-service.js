import { apiFetch } from './api.js';
import { API_BASE_URL } from '../utils/config.js';
import { buildHeaders } from './auth-service.js';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardPenyewa = () => apiFetch('/api/penyewa/dashboard');

// ── Tagihan & Pembayaran ──────────────────────────────────────────────────────
export const getTagihan = () => apiFetch('/api/penyewa/tagihan');

// Generate tagihan dasar bulan berikutnya (dipanggil otomatis saat bayar di muka)
export const mintaTagihan = () =>
  apiFetch('/api/penyewa/permintaan-tagihan', { method: 'POST' });

// Bayar tagihan (bisa 1 bulan atau multi bulan)
// data: { 'id-tagihan-Dasar', 'jumlah-bulan', 'bukti-pembayaran', 'id-rekening' }
export const kirimPembayaran = (data) =>
  apiFetch('/api/penyewa/pembayaran', { method: 'POST', body: data });

// Daftar rekening pembayaran resmi kost
export const getDaftarRekening = () =>
  apiFetch('/api/public/rekening', { auth: false });

// Generate PDF tagihan (mendukung respon blob PDF langsung maupun JSON berisi URL)
export async function generateTagihanPdf(idTagihan) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL()}/api/penyewa/generate/${encodeURIComponent(idTagihan)}/pdf`, {
      method: 'POST',
      headers: buildHeaders(true),
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }

  const ct = res.headers.get('content-type') ?? '';
  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    throw new Error(errJson?.pesan ?? errJson?.message ?? 'Gagal membuat PDF tagihan.');
  }

  if (ct.includes('application/pdf') || ct.includes('octet-stream')) {
    const blob = await res.blob();
    return { type: 'blob', blob };
  }

  const hasil = await res.json().catch(() => null);
  if (hasil?.status && hasil.status !== 'sukses') {
    throw new Error(hasil?.pesan ?? hasil?.message ?? 'Gagal membuat PDF tagihan.');
  }
  const url = hasil?.data?.url ?? hasil?.data?.pdfUrl ?? hasil?.data?.pdf ?? (typeof hasil?.data === 'string' ? hasil.data : null);
  return { type: 'json', url, data: hasil?.data ?? hasil };
}

// ── Pengumuman ────────────────────────────────────────────────────────────────
// filter: 'aktif' | 'riwayat'
export const getPengumuman = (filter) =>
  apiFetch(`/api/penyewa/pengumuman${filter ? `?filter=${filter}` : ''}`);

// ── Profil ────────────────────────────────────────────────────────────────────
// data: { nama-lengkap, nomor-telepon, nama-kontak-darurat?, nomor-kontak-darurat?, foto-profil? }
export const updateProfil = (data) =>
  apiFetch('/api/penyewa/profil', { method: 'PUT', body: data });

// Request OTP untuk ganti email
export const requestOtpEmail = (emailBaru) =>
  apiFetch('/api/penyewa/profil/email/request-otp', {
    method: 'POST',
    body: { 'email-baru': emailBaru },
  });

// Verifikasi OTP untuk konfirmasi ganti email
export const verifyOtpEmail = (emailBaru, otp) =>
  apiFetch('/api/penyewa/profil/email/verify-otp', {
    method: 'POST',
    body: { 'email-baru': emailBaru, otp },
  });

// Hapus foto profil
export const hapusFotoProfil = () =>
  apiFetch('/api/penyewa/profil/foto', { method: 'DELETE' });

// Ganti password
export const gantiPassword = (passwordLama, passwordBaru) =>
  apiFetch('/api/penyewa/profil/ganti-password', {
    method: 'PUT',
    body: { 'password-lama': passwordLama, 'password-baru': passwordBaru },
  });
