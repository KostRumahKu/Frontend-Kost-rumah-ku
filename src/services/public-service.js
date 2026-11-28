import { apiFetch } from './api.js';
import { API_BASE_URL } from '../utils/config.js';

// ── Katalog Kamar Publik ──────────────────────────────────────────────────────
export async function getKatalogKamarPublik() {
  const res = await fetch(`${API_BASE_URL()}/api/public/data-kamar`, {
    headers: { Accept: 'application/json' },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.pesan ?? json?.message ?? 'Gagal memuat data kamar.');
  }
  return json?.data ?? json ?? {};
}

// ── Rekening Pembayaran Resmi ─────────────────────────────────────────────────
export const getDaftarRekeningPublik = () =>
  apiFetch('/api/public/rekening', { auth: false });

// ── Booking Calon Penyewa ─────────────────────────────────────────────────────
// data: { nama-lengkap, email, nomor-telepon, nama-kontak-darurat, nomor-kontak-darurat,
//         tipe-kamar, durasi-bulan, lantai, tanggal-mulai }
export const buatBookingPublik = (data) =>
  apiFetch('/api/public/booking', { method: 'POST', body: data, auth: false });

// data: { id-pemesanan, bukti-pembayaran, id-rekening }
export const uploadBuktiBooking = (data) =>
  apiFetch('/api/public/booking/upload-bukti', { method: 'POST', body: data, auth: false });

// Cek detail & status booking (halaman khusus /booking/:id)
export const getDetailBookingPublik = (id) =>
  apiFetch(`/api/public/booking/${encodeURIComponent(id)}`, { auth: false });
