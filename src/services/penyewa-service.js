import { apiFetch } from './api.js';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardPenyewa = () => apiFetch('/api/penyewa/dashboard');

// ── Tagihan ───────────────────────────────────────────────────────────────────
export const getTagihan = () => apiFetch('/api/penyewa/tagihan');

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
